const { Express } = require("express");
const { formatResponse } = require("../../../formatResponse");
const mysql = require("mysql");

module.exports = {
  /*** @param {Express} app */
  main(app) {
    app.get("/v1/news/latest", (req, res) => {
      const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: "vcttools_news"
      });

      connection.connect((err) => {
        if (err) {
          console.error("Error connecting to database: ", err);
          res.status(500).json(formatResponse(500, null, "Error connecting to database"));
          return;
        }

        connection.query("SELECT * FROM `articles` ORDER BY `id` DESC LIMIT 25", (err, results) => {
          if (err) {
            console.error("Error querying database: ", err);
            res.status(500).json(formatResponse(500, null, "Error querying database"));
            return;
          }

          res.status(200).json(formatResponse(200, results));
        });
      });
    });
  }
};
