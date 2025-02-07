const pool = require('./db');

const createTables = async () => {
  try {
    await pool.query(
    `DROP TABLE users;

`
  );
    console.log("Tables created successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
   // enableVector();
    pool.end();
  }
 
};

module.exports=createTables;

// const enableVector = async () => {
//   try {
//     await pool.query("CREATE EXTENSION vector;");
//     console.log("Vector extension enabled successfully!");
//   } catch (err) {
//     console.error("Error enabling vector extension:", err);
//   } 
// };





