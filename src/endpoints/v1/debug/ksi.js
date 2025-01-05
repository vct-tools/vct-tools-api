const { Express } = require("express");
const { formatResponse } = require("../../../formatResponse");

module.exports = {
  /*** @param {Express} app */
  main(app) {
    app.get("/v1/debug/ksi", (req, res) => {
      res.status(200).json(
        formatResponse(200, {
          message: "I'm in the thick of it, everybody knows."
        })
      );
    });
  }
};
