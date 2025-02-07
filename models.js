const pool = require('./db');

const createTables = async () => {
  try {
    await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,   
    name TEXT NOT NULL,        
    interests vector(1536)   
);


`
  );
    console.log("Tables created successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
   // enableVector();
   // pool.end();
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





