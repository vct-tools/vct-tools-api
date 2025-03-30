import { Express } from "express";
import formatResponse from "../../../formatResponse.js";
import mysql from "mysql2/promise";
import { NewsArticleRow } from "../../../lib/db_rows.js";

export default function main(app: Express) {
  app.get("/v1/news/latest", async (req, res) => {
    try {
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT as string),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: "vcttools_news"
      });

      await connection.connect();

      const [results] = await connection.query("SELECT * FROM `articles` ORDER BY `id` DESC LIMIT 25") as [NewsArticleRow[], any];

      await connection.end();
      res.status(200).json(formatResponse(200, results));
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
