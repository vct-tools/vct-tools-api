const { Express, query } = require("express");
const { formatResponse } = require("../../../formatResponse");
const mysql = require("mysql");

module.exports = {
  /*** @param {Express} app */
  main(app) {
    app.get("/v1/bugs/list", (req, res) => {
      const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: "vcttools_bugs"
      });

      connection.connect((err) => {
        if (err) {
          console.error("Error connecting to database: ", err);
          res.status(500).json(formatResponse(500, null, "Error connecting to database"));
          return;
        }

        const filterTitle = req.query.filter_name || null;
        const filterScope = req.query.filter_scope || null;
        const filterOutcome = req.query.filter_outcome || null;

        const conditions = [];
        const args = [];

        if (filterTitle != null) {
          conditions.push("title LIKE ?");
          args.push(`%${filterTitle}%`);
        }
        if (filterScope != null) {
          conditions.push("scope = ?");
          args.push(filterScope);
        }
        if (filterOutcome != null) {
          conditions.push("outcome = ?");
          args.push(filterOutcome);
        }

        let query = "SELECT * FROM `bugs`";

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY `id` DESC LIMIT 25";
        connection.query(query, args, (err, results) => {
          if (err) {
            console.error("Error querying database: ", err);
            res.status(500).json(formatResponse(500, null, "Error querying database"));
            return;
          }

          res.status(200).send(formatResponse(200, results, null));
        });
      });
    });
  }
};
