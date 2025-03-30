import express from "express";
import dotenv from "dotenv";
import formatResponse from "./formatResponse.js";
import cors from "cors";
import cookieParser from "cookie-parser";

// Endpoints
// RSO Flow (v1)
import * as login_callback_v1 from "./endpoints/v1/rso_flow/login_callback.js";
import * as login_redirect_v1 from "./endpoints/v1/rso_flow/login_redirect.js";

// News (v1)
import * as news_latest_v1 from "./endpoints/v1/news/latest.js";

// Debug (v1)
import * as debug_ping_v1 from "./endpoints/v1/debug/ping.js";

// Account (v1)
import * as account_info_v1 from "./endpoints/v1/account/account_info.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(cookieParser());

// Endpoints inclusion
login_callback_v1.default(app);
login_redirect_v1.default(app);
news_latest_v1.default(app);
debug_ping_v1.default(app);
account_info_v1.default(app);

// 404
app.use((req, res) => {
  res.status(404).json(
    formatResponse(
      404,
      {
        path: req.path
      },
      "The specified path does not exist"
    )
  );
});

const server = app.listen(parseInt(process.env.PORT as string), () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
