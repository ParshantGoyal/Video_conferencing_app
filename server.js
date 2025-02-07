const { v4: uuidv4 } = require("uuid");
const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("http");
const createTables =require('./models');
const pool = require('./db')
const { Pool } = require("pg");
const { OpenAI } = require("openai");
const cors = require("cors");
const axios = require("axios");
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


async function getInterestEmbedding(interests, retries = 3) {
  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    console.error("Invalid interests provided:", interests);
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: interests.join(", "),
    });

    return response.data[0].embedding;
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      console.error(`Rate limit exceeded. Retrying in 10 seconds... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      return getInterestEmbedding(interests, retries - 1); // Retry
    } else {
      console.error("OpenAI error:", error.response?.data || error.message);

      // 🔥 Use Hugging Face as a Free Alternative
      console.log("Switching to Hugging Face model...");
      return getHuggingFaceEmbedding(interests);
    }
  }
}

// 🆓 Free Hugging Face Embedding (Alternative to OpenAI)
async function getHuggingFaceEmbedding(interests) {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      { inputs: interests.join(", ") },
      
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
    );

    return response.data[0]; // Returns 384-d vector
  } catch (error) {
    console.error("Hugging Face error:", error.response?.data || error.message);
    return null;
  }
}


// async function getInterestEmbedding(interests) {
//   if (!interests || !Array.isArray(interests) || interests.length === 0) {
//     console.error("Invalid interests provided:", interests);
//     return null;
//   }

//   try {
//     const response = await openai.embeddings.create({
//       model: "text-embedding-ada-002",
//       input: interests.join(", "),
//     });

//     return response.data[0].embedding;
//   } catch (error) {
//     if (error.status === 429) {
//       console.error("Rate limit exceeded. Retrying in 10 seconds...");
//       await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
//       return getInterestEmbedding(interests); // Retry
//     } else {
//       console.error("Error generating embeddings:", error);
//       return null;
//     }
//   }
// }




app.get("/",(req,res)=>{
res.send('welocme to the site')
})



// Store User Interest & Auto Start Matching
// app.post("/start", async (req, res) => {
//   const { username, interests } = req.body;
//   const interestVector = await getInterestEmbedding(interests);

//   await pool.query(
//     "INSERT INTO users (user_id, name, interests) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET interests = $3", 
//     [username, username, interestVector]
//   );

//   const { rows } = await pool.query(
//     "SELECT user_id, name FROM users WHERE user_id != $1 ORDER BY interests <=> $2 ASC LIMIT 1;",
//     [username, interestVector]
//   );

//   res.json(rows.length > 0 ? { match: rows[0] } : { message: "No match found!" });
// });
app.post("/start", async (req, res) => {
  try {
    const { username, interests } = req.body;
    if (!username || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ error: "Invalid username or interests" });
    }

    // Generate user_id (UUID)
    const user_id = uuidv4();

    // Generate interest embedding
    const interestVector = await getInterestEmbedding(interests);
    if (!interestVector) {
      return res.status(500).json({ error: "Failed to generate interest embedding" });
    }

    // Insert or update user in DB
    await pool.query(
      `INSERT INTO users (user_id, name, interests) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id) DO UPDATE 
       SET name = EXCLUDED.name, interests = EXCLUDED.interests`,
      [user_id, username, interestVector]
    );

    // Find the closest matching user
    const { rows } = await pool.query(
      `SELECT user_id, name FROM users 
       WHERE user_id != $1 
       ORDER BY interests <=> $2 
       LIMIT 1;`,
      [user_id, interestVector]
    );

    res.json(rows.length > 0 ? { match: rows[0] } : { message: "No match found!" });
  } catch (error) {
    console.error("Error in /start:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
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
