import { Express } from "express";
import formatResponse from "../../../formatResponse.js";
import mysql from "mysql2/promise";
import { verify } from "../../../lib/auth_token.js";
import { EmailVerificationRow, UserRow } from "../../../lib/db_rows.js";
import refreshRiotAccessToken from "../../../lib/refresh_token.js";

export default function main(app: Express) {
  app.get("/v1/account/account_info", async (req, res) => {
    try {
      const authToken = req.cookies.auth_token;
      if (!authToken) {
        res.status(401).json(formatResponse(401, null, "Unauthorized"));
        return;
      }

      const decoded = verify(authToken);

      if (decoded == null) {
        res.status(401).json(formatResponse(401, null, "Unauthorized"));
        return;
      }

      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT as string),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: "vcttools_users"
      });

      await connection.connect();

      const [results] = (await connection.query("SELECT * FROM `users` WHERE `riot_puuid` = ?", [decoded])) as [UserRow[], any];

      if (results.length === 0) {
        // Delete auth token cookie
        res.clearCookie("auth_token");

        await connection.end();
        res.status(404).json(formatResponse(404, null, "User not found"));
        return;
      }

      const user = results[0];
      let newTokens: {
        newRefreshToken: string;
        newAccessToken: string;
        expiresIn: number;
      };

      if (new Date().getTime() - new Date(user.token_last_refreshed).getTime() > user.token_expires_in * 1000) {
        // Refresh
        newTokens = await refreshRiotAccessToken(user.riot_refresh_token);
        // Store
        await connection.query("UPDATE `users` SET `riot_access_token` = ?, `riot_refresh_token` = ?, `token_expires_in` = ?, `token_last_refreshed` = ? WHERE `riot_puuid` = ?", [
          newTokens.newAccessToken,
          newTokens.newRefreshToken,
          newTokens.expiresIn,
          new Date(),
          user.riot_puuid
        ]);
      }

      // Get user gameName and tagLine
      const riotResponse = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-puuid/${decoded}`, {
        headers: {
          "X-Riot-Token": process.env.RIOT_API_KEY as string
        }
      });

      if (riotResponse.status !== 200) {
        await connection.end();
        res.status(500).json(formatResponse(500, null, "Failed to get user info"));
        return;
      }

      const riotPayload = await riotResponse.json();

      // Get pending email code
      const [selectEmailVerificationResults] = (await connection.query("SELECT * FROM `email_codes` WHERE `for_user_id` = ?", [user.id])) as [EmailVerificationRow[], any];

      await connection.end();
      res.status(200).json(
        formatResponse(200, {
          riotPuuid: decoded,
          riotGameName: riotPayload.gameName || null,
          riotTagLine: riotPayload.tagLine || null,
          email: user.email_on_file == 1 ? user.email : null,
          pendingEmailVerification: selectEmailVerificationResults.length > 0
        })
      );
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
