const { Pool } = require("pg");
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
pool.connect()
  .then(() => console.log("Connected to PostgreSQL on Render"))
  .catch(err => console.error("Connection error", err.stack));

module.exports = pool;





// -- Create the table for storing users
// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,
//   username VARCHAR(50) UNIQUE NOT NULL,
//   password VARCHAR(255) NOT NULL
// );
