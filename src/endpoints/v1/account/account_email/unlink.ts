import { Express } from "express";
import formatResponse from "../../../../formatResponse.js";
import mysql from "mysql2/promise";
import { verify } from "../../../../lib/auth_token.js";
import { UserRow } from "../../../../lib/db_rows.js";
import { sendEmail } from "../../../../lib/mail.js";
import * as EmailValidator from "email-validator";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default function main(app: Express) {
  app.delete("/v1/account/account_email/unlink", async (req, res) => {
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

      // Get the user object
      const [selectUserResults] = (await connection.query("SELECT * FROM `users` WHERE `riot_puuid` = ?", [decoded])) as [UserRow[], any];

      if (selectUserResults.length === 0) {
        // Delete auth token cookie
        res.clearCookie("auth_token", {
          httpOnly: true,
          secure: process.env.ENVIROMENT != "dev",
          domain: process.env.ENVIRONMENT == "dev" ? "localhost" : ".vcttools.net",
          sameSite: "none"
        });

        await connection.end();
        res.status(404).json(formatResponse(404, null, "User not found"));
        return;
      }

      const user = selectUserResults[0];

      if (user.email_on_file == 0) {
        await connection.end();
        res.status(400).json(formatResponse(400, null, "Email not linked"));
        return;
      }

      await connection.query("UPDATE `users` SET `email_on_file` = 0, `email` = '' WHERE `riot_puuid` = ?", [decoded]);

      await connection.end();
      res.status(200).json(formatResponse(200, {}));
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
