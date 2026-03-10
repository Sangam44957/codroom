const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    // FOR LOCAL NETWORK ACCESS (other devices on same WiFi):
    origin: ["http://10.170.232.122:3000", "http://localhost:3000"],
    
    // FOR PRODUCTION (after deployment):
    // origin: process.env.FRONTEND_URL || "http://localhost:3000",
    
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins a room
  socket.on("join-room", ({ roomId, userName, role }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        code: "",
        language: "javascript",
        users: [],
        messages: [],
      });
    }

    const room = rooms.get(roomId);

    const user = {
      id: socket.id,
      name: userName,
      role: role,
      peerId: null,
    };
    room.users.push(user);

    console.log(`👤 ${userName} (${role}) joined room: ${roomId}`);

    socket.emit("room-state", {
      code: room.code,
      language: room.language,
      users: room.users,
      messages: room.messages,
    });

    socket.to(roomId).emit("user-joined", {
      user,
      users: room.users,
    });

    const joinMsg = {
      id: Date.now().toString(),
      sender: "System",
      role: "system",
      text: `${userName} joined the room`,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(joinMsg);
    io.to(roomId).emit("chat-message", joinMsg);
  });

  // User shares their Peer ID for video call
  socket.on("share-peer-id", ({ roomId, peerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const user = room.users.find((u) => u.id === socket.id);
      if (user) {
        user.peerId = peerId;
      }
    }

    // Tell everyone else in the room about this peer
    socket.to(roomId).emit("peer-id-received", {
      peerId,
      socketId: socket.id,
    });
  });

  // Code changed
  socket.on("code-change", ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) room.code = code;
    socket.to(roomId).emit("code-update", { code });
  });

  // Language changed
  socket.on("language-change", ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) room.language = language;
    socket.to(roomId).emit("language-update", { language });
  });

  // Code execution result
  socket.on("code-output", ({ roomId, output }) => {
    socket.to(roomId).emit("output-update", { output });
  });

  // Chat message
  socket.on("send-message", ({ roomId, text, sender, role }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const message = {
      id: Date.now().toString() + socket.id,
      sender,
      role,
      text,
      timestamp: new Date().toISOString(),
    };

    room.messages.push(message);
    io.to(roomId).emit("chat-message", message);
  });

  // User disconnects
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    rooms.forEach((room, roomId) => {
      const index = room.users.findIndex((u) => u.id === socket.id);
      if (index !== -1) {
        const user = room.users[index];
        room.users.splice(index, 1);

        io.to(roomId).emit("user-left", {
          user,
          users: room.users,
        });

        const leaveMsg = {
          id: Date.now().toString(),
          sender: "System",
          role: "system",
          text: `${user.name} left the room`,
          timestamp: new Date().toISOString(),
        };
        room.messages.push(leaveMsg);
        io.to(roomId).emit("chat-message", leaveMsg);

        console.log(`👤 ${user.name} left room: ${roomId}`);

        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
    });
  });
});

const PORT = 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Socket.io server running on:\n`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://10.170.232.122:${PORT}\n`);
});