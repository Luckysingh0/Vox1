require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const folderRoutes = require("./routes/folderRoutes");
const bookRoutes = require("./routes/bookRoutes");
const noteRoutes = require("./routes/noteRoutes");
const agentRoutes = require("./routes/agentRoutes");

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" },
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Serve uploaded PDFs statically so the frontend PDF viewer can load them
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/agent", agentRoutes);

app.get("/", (req, res) => {
  res.send("PDF Voice Reader API is running");
});

// Socket.io - will be used for real-time voice agent events later
// (e.g. streaming transcript, mouse position updates, live tool-call results)
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
