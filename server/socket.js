const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Store room data in memory
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins a room
  socket.on("join-room", ({ roomId, userName, role }) => {
    socket.join(roomId);

    // Initialize room if not exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        code: "",
        language: "javascript",
        users: [],
      });
    }

    const room = rooms.get(roomId);

    // Add user to room
    const user = {
      id: socket.id,
      name: userName,
      role: role, // "interviewer" or "candidate"
    };
    room.users.push(user);

    console.log(`👤 ${userName} (${role}) joined room: ${roomId}`);

    // Send current room state to the new user
    socket.emit("room-state", {
      code: room.code,
      language: room.language,
      users: room.users,
    });

    // Notify others that someone joined
    socket.to(roomId).emit("user-joined", {
      user,
      users: room.users,
    });
  });

  // Code changed
  socket.on("code-change", ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.code = code;
    }

    // Send to everyone EXCEPT the sender
    socket.to(roomId).emit("code-update", { code });
  });

  // Language changed
  socket.on("language-change", ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.language = language;
    }

    socket.to(roomId).emit("language-update", { language });
  });

  // Code execution result (share output with both users)
  socket.on("code-output", ({ roomId, output }) => {
    socket.to(roomId).emit("output-update", { output });
  });

  // User disconnects
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      const index = room.users.findIndex((u) => u.id === socket.id);
      if (index !== -1) {
        const user = room.users[index];
        room.users.splice(index, 1);

        // Notify others
        io.to(roomId).emit("user-left", {
          user,
          users: room.users,
        });

        console.log(`👤 ${user.name} left room: ${roomId}`);

        // Clean up empty rooms
        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
    });
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Socket.io server running on http://localhost:${PORT}\n`);
});