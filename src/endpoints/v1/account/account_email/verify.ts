import { Express } from "express";
import formatResponse from "../../../../formatResponse.js";
import mysql from "mysql2/promise";
import { verify } from "../../../../lib/auth_token.js";
import { UserRow, EmailVerificationRow } from "../../../../lib/db_rows.js";

export default function main(app: Express) {
  app.post("/v1/account/account_email/verify", async (req, res) => {
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

      const userCode = req.body.code as string;
      if (!userCode) {
        res.status(400).json(formatResponse(400, null, "No verification code provided"));
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
        res.clearCookie("auth_token");

        await connection.end();
        res.status(404).json(formatResponse(404, null, "User not found"));
        return;
      }

      const user = selectUserResults[0];

      const [selectEmailVerificationResults] = (await connection.query("SELECT * FROM `email_codes` WHERE `for_user_id` = ?", [user.id])) as [EmailVerificationRow[], any];

      if (selectEmailVerificationResults.length === 0) {
        await connection.end();
        res.status(404).json(formatResponse(404, null, "No email verification code found"));
        return;
      }

      const emailVerification = selectEmailVerificationResults[0];

      // Compare
      if (emailVerification.verification_code !== userCode) {
        await connection.query("UPDATE `email_codes` SET `attempts_remaining` = `attempts_remaining` - 1 WHERE `for_user_id` = ?", [user.id]);

        const [updatedEmailVerificationResults] = await connection.query("SELECT `attempts_remaining` FROM `email_codes` WHERE `for_user_id` = ?", [user.id]) as [EmailVerificationRow[], any];
        const attempts = updatedEmailVerificationResults[0].attempts_remaining;

        if (attempts == 0) {
          await connection.query("DELETE FROM `email_codes` WHERE `for_user_id` = ?", [user.id]);

          await connection.end();
          res.status(400).json(formatResponse(400, { attempts }, "Incorrect verification code"));
          return;
        }

        await connection.end();
        res.status(400).json(formatResponse(400, { attempts }, "Incorrect verification code"));
        return;
      }

      // Update email and email_on_file
      await connection.query("UPDATE `users` SET `email` = ?, `email_on_file` = 1 WHERE `riot_puuid` = ?", [emailVerification.new_email, decoded]);

      // Delete email code
      await connection.query("DELETE FROM `email_codes` WHERE `for_user_id` = ?", [user.id]);

      await connection.end();
      res.status(200).json(formatResponse(200, { message: "Email verified" }));
    } catch (e) {
      console.error(e);
      res.status(500).json(formatResponse(500, null, "Internal server error"));
    }
  });
}
