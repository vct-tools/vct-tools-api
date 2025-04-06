import express from "express";
import dotenv from "dotenv";
import formatResponse from "./formatResponse.js";
import cors from "cors";
import cookieParser from "cookie-parser";

// Endpoints
// RSO Flow (v1)
import * as login_callback_v1 from "./endpoints/v1/rso_flow/login_callback.js";
import * as login_redirect_v1 from "./endpoints/v1/rso_flow/login_redirect.js";
import * as logout_callback_v1 from "./endpoints/v1/rso_flow/logout_callback.js";

// News (v1)
import * as news_latest_v1 from "./endpoints/v1/news/latest.js";

// Debug (v1)
import * as debug_ping_v1 from "./endpoints/v1/debug/ping.js";

// Account (v1)
import * as account_info_v1 from "./endpoints/v1/account/account_info.js";
import * as account_delete_v1 from "./endpoints/v1/account/account_delete.js";
import * as account_email_update_v1 from "./endpoints/v1/account/account_email/update.js";
import * as account_email_verify_v1 from "./endpoints/v1/account/account_email/verify.js";
import * as account_email_unlink_v1 from "./endpoints/v1/account/account_email/unlink.js";
import * as account_data_request_v1 from "./endpoints/v1/account/data_request.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "https://vcttools.net",
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Endpoints inclusion
login_callback_v1.default(app);
login_redirect_v1.default(app);
news_latest_v1.default(app);
debug_ping_v1.default(app);
account_info_v1.default(app);
logout_callback_v1.default(app);
account_delete_v1.default(app);
account_email_update_v1.default(app);
account_email_verify_v1.default(app);
account_email_unlink_v1.default(app);
account_data_request_v1.default(app);

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
