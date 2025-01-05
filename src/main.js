const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { formatResponse } = require("./formatResponse");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());

// Load endpoints from ./endpoints/**/*.js
function loadEndpointsFromDir(dir) {
  console.log(`Scanning: ${dir}`);
  fs.readdirSync(dir).forEach((entry) => {
    if (entry.endsWith(".js")) {
      console.log(`Loading endpoint: ${path.join(dir, entry)}`);
      require(path.join(dir, entry)).main(app);
    } else {
      loadEndpointsFromDir(path.join(dir, entry));
    }
  });
}

loadEndpointsFromDir(path.join(__dirname, "endpoints"));

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

const server = app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
