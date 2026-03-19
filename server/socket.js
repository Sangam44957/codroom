// NOTE: Requires Node.js 18+ for built-in fetch support.
// If on Node 16 or below, run: npm install node-fetch
// and add: const fetch = require("node-fetch"); at the top.

const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

// Debounce timers for snapshots
const snapshotTimers = new Map();

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, userName, role }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        code: "",
        language: "javascript",
        users: [],
        messages: [],
        interviewId: null,
      });
    }

    const room = rooms.get(roomId);

    // Prevent duplicate users (e.g. reconnects)
    const existingUser = room.users.find((u) => u.name === userName && u.role === role);
    if (existingUser) {
      existingUser.id = socket.id;
    } else {
      const user = {
        id: socket.id,
        name: userName,
        role: role,
        peerId: null,
      };
      room.users.push(user);
    }

    const currentUser = room.users.find((u) => u.id === socket.id);

    console.log(`👤 ${userName} (${role}) joined room: ${roomId}`);

    socket.emit("room-state", {
      code: room.code,
      language: room.language,
      users: room.users,
      messages: room.messages,
      interviewId: room.interviewId,
    });

    socket.to(roomId).emit("user-joined", {
      user: currentUser,
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

  // Store interview ID for snapshot recording
  // Also broadcast to all room members so candidates know interview started
  socket.on("set-interview-id", ({ roomId, interviewId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.interviewId = interviewId;
      console.log(`📝 Interview ${interviewId} started in room ${roomId}`);
      // Broadcast to everyone in the room (including the interviewer)
      io.to(roomId).emit("interview-started", { interviewId });
    }
  });

  socket.on("share-peer-id", ({ roomId, peerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const user = room.users.find((u) => u.id === socket.id);
      if (user) user.peerId = peerId;
    }
    socket.to(roomId).emit("peer-id-received", { peerId, socketId: socket.id });
  });

  socket.on("code-change", ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.code = code;

      // Debounced snapshot saving (saves 3 seconds after last keystroke)
      if (room.interviewId) {
        const timerKey = `${roomId}-snapshot`;

        if (snapshotTimers.has(timerKey)) {
          clearTimeout(snapshotTimers.get(timerKey));
        }

        snapshotTimers.set(
          timerKey,
          setTimeout(() => {
            saveSnapshot(room.interviewId, code);
            snapshotTimers.delete(timerKey);
          }, 3000)
        );
      }
    }
    socket.to(roomId).emit("code-update", { code });
  });

  socket.on("language-change", ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) room.language = language;
    socket.to(roomId).emit("language-update", { language });
  });

  socket.on("code-output", ({ roomId, output }) => {
    socket.to(roomId).emit("output-update", { output });
  });

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

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    rooms.forEach((room, roomId) => {
      const index = room.users.findIndex((u) => u.id === socket.id);
      if (index !== -1) {
        const user = room.users[index];
        room.users.splice(index, 1);

        io.to(roomId).emit("user-left", { user, users: room.users });

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
          // Clear any pending snapshot timers before deleting
          const timerKey = `${roomId}-snapshot`;
          if (snapshotTimers.has(timerKey)) {
            clearTimeout(snapshotTimers.get(timerKey));
            snapshotTimers.delete(timerKey);
          }
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
    });
  });
});

// Save snapshot to database via the Next.js API
async function saveSnapshot(interviewId, code) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(
      `${appUrl}/api/interviews/${interviewId}/snapshots`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }
    );

    if (res.ok) {
      console.log(`📸 Snapshot saved for interview ${interviewId}`);
    } else {
      const data = await res.json().catch(() => ({}));
      console.error(`Failed to save snapshot: ${data.error || res.status}`);
    }
  } catch (error) {
    console.error("Snapshot fetch error:", error.message);
  }
}

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Socket.io server running on http://localhost:${PORT}\n`);
});
