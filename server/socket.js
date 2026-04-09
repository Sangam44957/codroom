const { createServer } = require("http");
const { Server } = require("socket.io");
const { jwtVerify } = require("jose");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const REQUIRED_ENV = ["JWT_SECRET", "INTERNAL_SECRET", "DATABASE_URL"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n❌ Missing required environment variable: ${key}\n   Add it to your .env file and restart.\n`);
    process.exit(1);
  }
}

// ── Import services directly — no HTTP-back-to-self ──────────────────────────
const { getRoomOwnerData, getMessages, persistMessage } = require("./room.service");
const { saveSnapshot, saveEvent } = require("./interview.service");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "codroom-token";

// In-memory room state
const rooms = new Map();
const snapshotTimers = new Map();

// ─── Per-socket rate limiter ──────────────────────────────────────────────────
const rateBuckets = new Map();

const RATE_LIMITS = {
  "code-change":      { capacity: 30, refillRate: 20 },
  "send-message":     { capacity: 10, refillRate:  2 },
  "timeline-event":   { capacity: 20, refillRate: 10 },
  "join-room":        { capacity:  3, refillRate:  1 },
  "language-change":  { capacity:  5, refillRate:  1 },
  "whiteboard-draw":  { capacity: 60, refillRate: 40 },
  "whiteboard-clear": { capacity:  5, refillRate:  1 },
};

function isAllowed(socketId, event) {
  const limits = RATE_LIMITS[event];
  if (!limits) return true;

  if (!rateBuckets.has(socketId)) rateBuckets.set(socketId, {});
  const buckets = rateBuckets.get(socketId);
  const now = Date.now();

  if (!buckets[event]) {
    buckets[event] = { tokens: limits.capacity, lastRefill: now };
  }

  const bucket = buckets[event];
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(limits.capacity, bucket.tokens + elapsed * limits.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function cleanupRateBucket(socketId) {
  rateBuckets.delete(socketId);
}

// ─── Seed room state from DB on first join ────────────────────────────────────
async function seedRoomFromDB(roomId) {
  try {
    const [data, messages] = await Promise.all([
      getRoomOwnerData(roomId),
      getMessages(roomId, 200),
    ]);
    const lastCode = data?.interview?.snapshots?.[0]?.code || "";
    const interviewId = data?.interview?.status === "in_progress" ? data.interview.id : null;
    return {
      createdById: data?.createdById || null,
      language: data?.language || "javascript",
      lastCode,
      interviewId,
      persistedMessages: messages || [],
    };
  } catch {
    return null;
  }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const cookieMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    const token = cookieMatch?.[1] || socket.handshake.auth?.token;

    if (!token) {
      socket.data.user = null;
      socket.data.isAuthenticated = false;
      return next();
    }

    const { payload } = await jwtVerify(token, SECRET);
    socket.data.user = payload;
    socket.data.isAuthenticated = true;
    next();
  } catch {
    socket.data.user = null;
    socket.data.isAuthenticated = false;
    next();
  }
});

// ─── Room ownership lookup ────────────────────────────────────────────────────
async function getRoomOwnerIdFromDB(roomId) {
  try {
    const data = await getRoomOwnerData(roomId);
    return data?.createdById || null;
  } catch {
    return null;
  }
}

// ─── Connection handler ───────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`✅ Socket connected: ${socket.id} | auth: ${socket.data.isAuthenticated}`);

  socket.on("join-room", async ({ roomId, userName, role: clientRole }) => {
    if (!roomId || !userName) return;
    if (!isAllowed(socket.id, "join-room")) return;

    let authoritativeRole = "candidate";
    if (socket.data.isAuthenticated && socket.data.user) {
      const ownerId = await getRoomOwnerIdFromDB(roomId);
      if (ownerId && ownerId === socket.data.user.userId) {
        authoritativeRole = "interviewer";
      }
    }

    socket.data.roomId = roomId;
    socket.data.userName = userName;
    socket.data.role = authoritativeRole;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      const dbData = await seedRoomFromDB(roomId);
      rooms.set(roomId, {
        code: dbData?.lastCode || "",
        language: dbData?.language || "javascript",
        users: [],
        messages: dbData?.persistedMessages || [],
        interviewId: dbData?.interviewId || null,
        events: [],
        focusMode: false,
      });
    }

    const room = rooms.get(roomId);

    const existingIdx = room.users.findIndex(
      (u) => u.name === userName && u.role === authoritativeRole
    );
    if (existingIdx !== -1) {
      room.users[existingIdx].id = socket.id;
    } else {
      room.users.push({ id: socket.id, name: userName, role: authoritativeRole, peerId: null });
    }

    console.log(`👤 ${userName} (${authoritativeRole}) joined room: ${roomId}`);

    socket.emit("room-state", {
      code: room.code,
      language: room.language,
      users: room.users,
      messages: room.messages.slice(-200),
      interviewId: room.interviewId,
      events: room.events || [],
      focusMode: room.focusMode || false,
      isEmptyRoom: room.users.length === 1 && !room.code && !room.interviewId,
    });

    socket.to(roomId).emit("user-joined", {
      user: room.users.find((u) => u.id === socket.id),
      users: room.users,
    });

    const joinMsg = {
      id: `${Date.now()}-${socket.id}`,
      sender: "System",
      role: "system",
      text: `${userName} joined the room`,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(joinMsg);
    if (room.messages.length > 200) room.messages.shift();
    io.to(roomId).emit("chat-message", joinMsg);
    persistMessage(roomId, joinMsg).catch((err) =>
      console.error("[chat] persist error:", err.message)
    );
  });

  socket.on("set-focus-mode", ({ roomId, enabled }) => {
    if (socket.data.role !== "interviewer") return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.focusMode = !!enabled;
    io.to(roomId).emit("focus-mode-changed", { enabled: room.focusMode });
    console.log(`🔒 Focus mode ${room.focusMode ? "ON" : "OFF"} in room ${roomId}`);
  });

  socket.on("set-interview-id", ({ roomId, interviewId }) => {
    if (socket.data.role !== "interviewer") return;
    const room = rooms.get(roomId);
    if (room) {
      room.interviewId = interviewId;
      console.log(`📝 Interview ${interviewId} started in room ${roomId}`);
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
    if (!isAllowed(socket.id, "code-change")) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.code = code;

    if (room.interviewId) {
      const timerKey = `${roomId}-snapshot`;
      if (snapshotTimers.has(timerKey)) clearTimeout(snapshotTimers.get(timerKey));
      snapshotTimers.set(
        timerKey,
        setTimeout(() => {
          saveSnapshot(room.interviewId, code);
          snapshotTimers.delete(timerKey);
        }, 1000)
      );
    }

    socket.to(roomId).emit("code-update", { code });
  });

  socket.on("language-change", ({ roomId, language }) => {
    if (!isAllowed(socket.id, "language-change")) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.language = language;
    if (room.interviewId) {
      const e = { type: "language_change", label: language, timestamp: new Date().toISOString() };
      room.events = room.events || [];
      room.events.push(e);
      if (room.events.length > 500) room.events.shift();
      saveEvent(room.interviewId, e.type, e.label);
    }
    socket.to(roomId).emit("language-update", { language });
  });

  socket.on("code-output", ({ roomId, output }) => {
    if (!socket.data.isAuthenticated) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.interviewId && socket.data.role === "interviewer") {
      const event = {
        type: output.status === "error" ? "run_fail" : "run_pass",
        timestamp: new Date().toISOString(),
        label: output.status === "error" ? "Run Failed" : "Run Passed",
      };
      room.events = room.events || [];
      room.events.push(event);
      if (room.events.length > 500) room.events.shift();
      saveEvent(room.interviewId, event.type, event.label);
    }
    socket.to(roomId).emit("output-update", { output });
  });

  socket.on("timeline-event", ({ roomId, event }) => {
    if (!socket.data.isAuthenticated) return;
    if (!isAllowed(socket.id, "timeline-event")) return;
    const room = rooms.get(roomId);
    if (!room || !room.interviewId) return;
    const e = { ...event, timestamp: new Date().toISOString() };
    room.events = room.events || [];
    room.events.push(e);
    if (room.events.length > 500) room.events.shift();
    io.to(roomId).emit("timeline-event", e);
    saveEvent(room.interviewId, e.type, e.label);
  });

  socket.on("whiteboard-draw", ({ roomId, stroke }) => {
    if (!isAllowed(socket.id, "whiteboard-draw")) return;
    const room = rooms.get(roomId);
    if (!room) return;
    socket.to(roomId).emit("whiteboard-draw", { stroke });
  });

  socket.on("whiteboard-clear", ({ roomId }) => {
    if (!isAllowed(socket.id, "whiteboard-clear")) return;
    const room = rooms.get(roomId);
    if (!room) return;
    io.to(roomId).emit("whiteboard-clear");
  });

  socket.on("camera-toggle", ({ roomId, isOff }) => {
    socket.to(roomId).emit("remote-camera-toggle", { isOff });
  });

  socket.on("send-message", ({ roomId, text }) => {
    if (!isAllowed(socket.id, "send-message")) return;
    const room = rooms.get(roomId);
    if (!room || !text?.trim()) return;

    const sender = socket.data.userName || "Anonymous";
    const role = socket.data.role || "candidate";

    const message = {
      id: `${Date.now()}-${socket.id}`,
      sender,
      role,
      text: text.trim().slice(0, 2000),
      timestamp: new Date().toISOString(),
    };

    room.messages.push(message);
    if (room.messages.length > 200) room.messages.shift();
    io.to(roomId).emit("chat-message", message);
    persistMessage(roomId, message).catch((err) =>
      console.error("[chat] persist error:", err.message)
    );
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    cleanupRateBucket(socket.id);

    rooms.forEach((room, roomId) => {
      const idx = room.users.findIndex((u) => u.id === socket.id);
      if (idx === -1) return;

      const user = room.users[idx];
      room.users.splice(idx, 1);
      io.to(roomId).emit("user-left", { user, users: room.users });

      const leaveMsg = {
        id: `${Date.now()}-${socket.id}`,
        sender: "System",
        role: "system",
        text: `${user.name} left the room`,
        timestamp: new Date().toISOString(),
      };
      room.messages.push(leaveMsg);
      if (room.messages.length > 200) room.messages.shift();
      io.to(roomId).emit("chat-message", leaveMsg);
      persistMessage(roomId, leaveMsg).catch((err) =>
        console.error("[chat] persist error:", err.message)
      );

      console.log(`👤 ${user.name} left room: ${roomId}`);

      if (room.users.length === 0) {
        const timerKey = `${roomId}-snapshot`;
        if (snapshotTimers.has(timerKey)) {
          clearTimeout(snapshotTimers.get(timerKey));
          snapshotTimers.delete(timerKey);
        }
        rooms.delete(roomId);
        console.log(`🗑️  Room ${roomId} cleaned up (empty)`);
      }
    });
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run: npx kill-port ${PORT}  then restart.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Socket.io server running on http://localhost:${PORT}\n`);
});

process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)); });
process.on("SIGINT",  () => { httpServer.close(() => process.exit(0)); });
