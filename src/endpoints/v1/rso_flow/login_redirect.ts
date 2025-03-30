import { Express } from "express";

export default function main(app: Express) {
  app.get("/v1/rso_flow/login_redirect", async (req, res) => {
    res.status(302).redirect(process.env.RSO_OAUTH_URL as string);
  });
}
