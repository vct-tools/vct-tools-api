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

const emailTemplate = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../../email_templates/verify_code.html"), "utf-8").toString();

export default function main(app: Express) {
  app.post("/v1/account/account_email/update", async (req, res) => {
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

      // Generate a 6 digit code
      const verification_code = Math.floor(100000 + Math.random() * 900000).toString();

      // Get the user's email from the form data
      const email = req.body.email as string;
      if (!email) {
        await connection.end();
        res.status(400).json(formatResponse(400, null, "No email provided"));
        return;
      }
      
      // Check if the email is valid
      if (!EmailValidator.validate(email)) {
        await connection.end();
        res.status(400).json(formatResponse(400, null, "Invalid email address"));
        return;
      }

      // Get the user object
      const [selectUserResults] = (await connection.query("SELECT * FROM `users` WHERE `riot_puuid` = ?", [decoded])) as [UserRow[], any];

      if (selectUserResults.length === 0) {
        // Delete auth token cookie
        res.clearCookie("auth_token");

        await connection.end();
        res.status(404).json(formatResponse(404, null, "User not found"));
        return;
      }

      const user = selectUserResults[0];

      // Send the email
      await sendEmail({
        to: email,
        subject: "Verify your email address",
        contents: {
          plaintext: `Hello! This email contains a code to verify your email address with.\nYour verification code is: [${verification_code}]\nIf you were not expecting this email, you can ignore it.`,
          html: emailTemplate.replace("{{#}}", verification_code)
        }
      });

      // Add the verification code to the database
      // If an old code exists, delete it
      await connection.query("DELETE FROM `email_codes` WHERE `for_user_id` = ?", [user.id]);
      await connection.query("INSERT INTO `email_codes` (`for_user_id`, `verification_code`, `new_email`) VALUES (?, ?, ?)", [user.id, verification_code, email]);

      await connection.end();
      res.status(200).json(formatResponse(200, { sentTo: email }));
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
