const { Express } = require("express");
const { formatResponse } = require("../../../formatResponse");

module.exports = {
  /*** @param {Express} app */
  main(app) {
    app.get("/v1/debug/ping", (req, res) => {
      res.status(200).json(
        formatResponse(200, {
          message: "pong"
        })
      );
    });
  }
};
