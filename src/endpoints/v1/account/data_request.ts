import { Express } from "express";
import formatResponse from "../../../formatResponse.js";
import mysql from "mysql2/promise";
import { verify } from "../../../lib/auth_token.js";
import { DataRequestRow, UserRow } from "../../../lib/db_rows.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendEmail } from "../../../lib/mail.js";

const emailTemplate = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../email_templates/data_request.html"), "utf-8").toString();

export default function main(app: Express) {
  app.get("/v1/account/data_request", async (req, res) => {
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

      const [users] = (await connection.query("SELECT * FROM `users` WHERE `riot_puuid` = ?", [decoded])) as [UserRow[], any];

      if (users.length == 0) {
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

      const user = users[0];
      if (user.email_on_file == 0) {
        await connection.end();
        res.status(400).json(formatResponse(400, null, "No email on file"));
        return;
      }

      const [dataRequests] = (await connection.query("SELECT * FROM `data_requests` WHERE `user_id` = ?", [user.id])) as [DataRequestRow[], any];

      if (dataRequests.length > 0) {
        const dataRequest = dataRequests[0];
        const lastDataRequest = dataRequest.last_data_request;

        const requestCooldown = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(lastDataRequest).getTime() < requestCooldown) {
          await connection.end();
          res.status(400).json(formatResponse(400, null, "Please allow 30 days between data requests"));
          return;
        }

        // Delete the old data request
        await connection.query("DELETE FROM `data_requests` WHERE `user_id` = ?", [user.id]);
      }

      // Create a new data request
      await connection.query("INSERT INTO `data_requests` (`user_id`, `last_data_request`) VALUES (?, ?)", [user.id, new Date().toISOString()]);

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

      // Construct the email
      const emailHtml = emailTemplate
        .replace("{{#puuid}}", decoded)
        .replace("{{#gameName}}", riotPayload.gameName)
        .replace("{{#tagLine}}", riotPayload.tagLine)
        .replace("{{#emailOnFile}}", user.email_on_file == 0 ? "No" : "Yes")
        .replace("{{#email}}", user.email_on_file == 0 ? "N/A" : user.email)
        .replace("{{#accountCreationDate}}", new Date(user.account_created).toUTCString())
        .replace("{{#userId}}", user.id.toString());

      const emailPlainText =
        "STORED PERSONAL DATA REQUEST\n" +
        "\n" +
        "As part of VCT Tools' Privacy Policy, you can request a copy of the data we have stored about you.\n" +
        "\n" +
        "Riot Games player UUID (Universally Unique Identifier) : " +
        decoded +
        "\n" +
        "Riot Games game name : " +
        riotPayload.gameName +
        "\n" +
        "Riot Games tag line : " +
        riotPayload.tagLine +
        "\n" +
        "Email on file? : " +
        (user.email_on_file == 0 ? "No" : "Yes") +
        "\n" +
        "Email : " +
        (user.email_on_file == 0 ? "N/A" : user.email) +
        "\n" +
        "Account creation date : " +
        new Date(user.account_created).toUTCString() +
        "\n" +
        "VCT Tools user ID : " +
        user.id +
        "\n";

      // Send the email
      await sendEmail({
        to: user.email,
        subject: "Stored personal data request",
        contents: {
          plaintext: emailPlainText,
          html: emailHtml
        }
      });

      // Send the response
      await connection.end();
      res.status(200).json(formatResponse(200, { sentTo: user.email }));
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
