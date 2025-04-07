import { Express } from "express";
import formatResponse from "../../../formatResponse.js";
import mysql from "mysql2/promise";
import { UserRow } from "../../../lib/db_rows.js";
import * as authToken from "../../../lib/auth_token.js";

export default function main(app: Express) {
  app.get("/v1/rso_flow/logout_callback", async (req, res) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.ENVIROMENT != "dev",
      domain: process.env.ENVIRONMENT == "dev" ? "localhost" : ".vcttools.net",
      sameSite: "none"
    });
    res.status(301).redirect(process.env.ENVIRONMENT == "dev" ? "http://localhost:5173/account?logout=true" : "https://vcttools.net/account?logout=true");
  });
}
