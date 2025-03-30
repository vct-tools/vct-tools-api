import { Express } from "express";
import formatResponse from "../../../formatResponse.js";

export default function main(app: Express) {
  app.get("/v1/debug/ping", (req, res) => {
    res.status(200).json(
      formatResponse(200, {
        message: "pong"
      })
    );
  });
}
