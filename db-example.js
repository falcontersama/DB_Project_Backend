const mysql = require("mysql");
const connection = mysql.createConnection({
  host: /*your host url*/,
  user: /*your host username*/,
  password: /*your host password*/,
  database: /*your database name*/
});

try {
  connection.connect();
} catch (error) {
  console.error("Can't connect to database.");
  throw error;
}

module.exports = connection;
