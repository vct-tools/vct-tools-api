import { Express } from "express";
import formatResponse from "../../../formatResponse.js";
import mysql from "mysql2/promise";
import { verify } from "../../../lib/auth_token.js";
import { UserRow } from "../../../lib/db_rows.js";

export default function main(app: Express) {
  app.delete("/v1/account/account_delete", async (req, res) => {
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

      // Remove user entry from database
      await connection.query("DELETE FROM `users` WHERE `riot_puuid` = ?", [decoded]);

      // Delete auth token cookie
      res.clearCookie("auth_token");

      await connection.end();
      res.status(200).json(formatResponse(200, {
        deletedPuuid: decoded
      }));
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
