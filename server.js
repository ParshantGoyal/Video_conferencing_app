import express from "express";
import { Server } from "socket.io";
import http from "http";
import pkg from "pg";
const { Pool } = pkg;
import cors from "cors";


// Load environment variables
// dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "https://random-chat-sable.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// PostgreSQL Database Connection (Use DATABASE_URL in Production)
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL || "postgres://postgres:yourpassword@localhost:5432/videocall",
//     ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false // Needed for Render or Cloud DB
// });

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Welcome to Random Video Chat API");
});

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "https://random-chat-sable.vercel.app",
        methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
});

const users = [];

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join", async ({ name, interests }) => {
        console.log(`User joined: ${name} with interests: ${interests}`);

        const newUser = { id: socket.id, name, interests, socketId: socket.id };
        users.push(newUser);
        matchUsers(socket);
    });

    socket.on("offer", ({ offer, peerId }) => {
        console.log(`Sending offer to: ${peerId}`);
        io.to(peerId).emit("offer", { offer });
    });

    socket.on("answer", ({ answer, peerId }) => {
        console.log(`Sending answer to: ${peerId}`);
        io.to(peerId).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ candidate, peerId }) => {
        console.log(`Sending ICE candidate to: ${peerId}`);
        io.to(peerId).emit("ice-candidate", { candidate });
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        const index = users.findIndex((user) => user.socketId === socket.id);
        if (index !== -1) users.splice(index, 1);
    });
});

// Matching Users Based on Interests
function matchUsers(socket) {
    const user = users.find((u) => u.socketId === socket.id);
    if (!user) return;

    let matchedUser = users.find(
        (u) => u.socketId !== user.socketId && u.interests.some((interest) => user.interests.includes(interest))
    );

    if (!matchedUser) {
        matchedUser = users.find((u) => u.socketId !== user.socketId);
    }

    if (matchedUser) {
        console.log(`Matched ${user.name} with ${matchedUser.name}`);
        io.to(user.socketId).emit("matched", { peerId: matchedUser.socketId });
        io.to(matchedUser.socketId).emit("matched", { peerId: user.socketId });
    }
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});






// /*
// FULL STACK RANDOM VIDEO CHAT APP
// Backend: Node.js (Express, Socket.io, PostgreSQL)
// Frontend: React (WebRTC, Socket.io)
// */

// // BACKEND CODE (server.js)

// import express from 'express';
// import { Server } from 'socket.io';
// import http from 'http';
// import pkg from 'pg';
// const { Pool } = pkg;

// import cors from 'cors';
// const app = express();
// // app.use(cors({ origin: "*" }))
// app.use(cors({
//     origin: "https://random-chat-sable.vercel.app/",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true // Allow cookies if needed
//   }));


// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: "https://random-chat-sable.vercel.app/",
//         methods: ["GET", "POST"]
//       },
// });


// app.use(express.json());

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'videocall',
//   password: 'yourpassword',
//   port: 5432,
// });

// app.get('/',(req,res)=>{
// res.send('welcome to the home')
// })

// const users = [];

// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('join', async ({ name, interests }) => {
//     const newUser = { id: socket.id, name, interests, socketId: socket.id };
//     users.push(newUser);
//     matchUsers(socket);
//   });

//   socket.on('offer', ({ offer, peerId }) => {
//     io.to(peerId).emit('offer', { offer });
//   });

//   socket.on('answer', ({ answer, peerId }) => {
//     io.to(peerId).emit('answer', { answer });
//   });

//   socket.on('ice-candidate', ({ candidate, peerId }) => {
//     io.to(peerId).emit('ice-candidate', { candidate });
//   });

//   socket.on('disconnect', () => {
//     const index = users.findIndex((user) => user.socketId === socket.id);
//     if (index !== -1) users.splice(index, 1);
//   });
// });

// function matchUsers(socket) {
//   const user = users.find((u) => u.socketId === socket.id);
//   if (!user) return;

//   let matchedUser = users.find(
//     (u) => u.socketId !== user.socketId && u.interests.some((interest) => user.interests.includes(interest))
//   );

//   if (!matchedUser) {
//     matchedUser = users.find((u) => u.socketId !== user.socketId);
//   }

//   if (matchedUser) {
//     io.to(user.socketId).emit('matched', { peerId: matchedUser.socketId });
//     io.to(matchedUser.socketId).emit('matched', { peerId: user.socketId });
//   }
// }

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
