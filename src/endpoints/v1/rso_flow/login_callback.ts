import { Express } from "express";
import formatResponse from "../../../formatResponse.js";
import mysql from "mysql2/promise";
import { UserRow } from "../../../lib/db_rows.js";
import * as authToken from "../../../lib/auth_token.js";

export default function main(app: Express) {
  app.get("/v1/rso_flow/login_callback", async (req, res) => {
    if (!req.query.code) {
      res.status(400).json(formatResponse(400, null, "Missing code query parameter"));
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("code", req.query.code as string);
      formData.append("redirect_uri", "https://api.vcttools.net/v1/rso_flow/login_callback");

      const data = await fetch("https://auth.riotgames.com/token", {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.RSO_CLIENT_ID}:${process.env.RSO_CLIENT_SECRET}`).toString(`base64`)}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        body: formData.toString()
      });

      if (data.status !== 200) {
        res.status(500).json(formatResponse(data.status, null, "Failed to get access token"));
        return;
      }

      const payload = await data.json();
      const tokens = {
        refresh_token: payload.refresh_token,
        id_token: payload.id_token,
        access_token: payload.access_token
      };

      // res.status(200).json(formatResponse(200, tokens, null));

      const userPuuid = (
        await (
          await fetch("https://asia.api.riotgames.com/riot/account/v1/accounts/me", {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`
            }
          })
        ).json()
      ).puuid;

      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT as string),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: "vcttools_users"
      });

      await connection.connect();
      const [results] = (await connection.query("SELECT * FROM users WHERE riot_puuid = ?", [
        userPuuid
      ])) as [UserRow[], any];

      if (results.length == 0) {
        connection.query(
          "INSERT INTO `users` (`id`, `riot_puuid`, `riot_refresh_token`, `riot_id_token`, `riot_access_token`, `account_created`, `token_last_refreshed`, `token_expires_in`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)",
          [
            userPuuid,
            tokens.refresh_token,
            tokens.id_token,
            tokens.access_token,
            new Date().toISOString(),
            new Date().toISOString(),
            payload.expires_in
          ]
        );

        // Success, redirect to account settings
        await connection.end();
        res.cookie("auth_token", authToken.generate(userPuuid), {
          maxAge: 1000 * 60 * 60 * 24 * 25,
          httpOnly: true,
          secure: process.env.ENVIROMENT != "dev",
          domain: ".vcttools.net",
          sameSite: "none"
        });
        res
          .status(302)
          .redirect(
            process.env.ENVIRONMENT == "dev"
              ? "http://localhost:5173/account"
              : "https://vcttools.net/account"
          );
      } else {
        connection.query(
          "UPDATE `users` SET `riot_puuid` = ?, `riot_refresh_token` = ?, `riot_id_token` = ?, `riot_access_token` = ?, `token_last_refreshed` = ?, `token_expires_in` = ? WHERE `riot_puuid` = ?",
          [
            userPuuid,
            tokens.refresh_token,
            tokens.id_token,
            tokens.access_token,
            new Date().toISOString(),
            payload.expires_in,
            userPuuid
          ]
        );

        // Success, redirect to account settings
        await connection.end();
        res.cookie("auth_token", authToken.generate(userPuuid), {
          maxAge: 1000 * 60 * 60 * 24 * 25,
          httpOnly: true,
          secure: process.env.ENVIROMENT != "dev",
          domain: ".vcttools.net",
          sameSite: "none"
        });
        res
          .status(302)
          .redirect(
            process.env.ENVIRONMENT == "dev"
              ? "http://localhost:5173/account"
              : "https://vcttools.net/account"
          );
      }
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
