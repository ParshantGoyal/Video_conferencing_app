const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("http");
const createTables =require('./models');
const pool = require('./db')
const { Pool } = require("pg");
const { OpenAI } = require("openai");
const cors = require("cors");
require('dotenv').config();

const app = express();
const server = createServer(app);
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
const io = new Server(server, { cors: { origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true } });
app.use(express.json());

pool;
createTables();
// PostgreSQL Connection

// OpenAI for interest embeddings
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});

async function getInterestEmbedding(interests) {
  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    console.error("Invalid interests provided:", interests);
    return null;  // Return null or a default vector
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: interests.join(", "),  // Now safely joining
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return null;
  }
}

app.get("/",(req,res)=>{
res.send('welocme to the site')
})



// Store User Interest & Auto Start Matching
app.post("/start", async (req, res) => {
  const { username, interests } = req.body;
  const interestVector = await getInterestEmbedding(interests);

  await db.query(
    "INSERT INTO users (user_id, name, interests) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET interests = $3", 
    [username, username, interestVector]
  );

  const { rows } = await db.query(
    "SELECT user_id, name FROM users WHERE user_id != $1 ORDER BY interests <=> $2 ASC LIMIT 1;",
    [username, interestVector]
  );

  res.json(rows.length > 0 ? { match: rows[0] } : { message: "No match found!" });
});

// WebRTC Signaling
io.on("connection", (socket) => {
  socket.on("findMatch", async ({ username, interests }) => {
    const match = await db.query("SELECT user_id FROM users WHERE user_id != $1 LIMIT 1", [username]);
    if (match.rows.length > 0) {
      socket.emit("matchFound", { peerId: match.rows[0].user_id });
    }
  });

  socket.on("disconnect", () => console.log("User disconnected"));
});

server.listen(5000, () => console.log("Server running on port 5000"));
