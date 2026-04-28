const { createServer } = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const { jwtVerify } = require("jose");
const path = require("path");
const Sentry = require("@sentry/node");
const { RoomStateManager } = require("./roomStateManager.cjs");
const { logger, createSocketLogger } = require("./logger.cjs");
const { sanitizeName, sanitizeText } = require("./utils.cjs");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.2,
});

const REQUIRED_ENV = ["JWT_SECRET", "INTERNAL_SECRET", "DATABASE_URL", "REDIS_URL"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n❌ Missing required environment variable: ${key}\n   Add it to your .env file and restart.\n`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("\n❌ JWT_SECRET must be at least 32 characters.\n");
  process.exit(1);
}
if (process.env.INTERNAL_SECRET.length < 32) {
  console.error("\n❌ INTERNAL_SECRET must be at least 32 characters.\n");
  process.exit(1);
}

// Log environment configuration for debugging
logger.info({
  nodeEnv: process.env.NODE_ENV,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  socketPort: process.env.PORT || 3001,
  redisUrl: process.env.REDIS_URL ? '[CONFIGURED]' : '[MISSING]'
}, 'Environment configuration');

const prisma = require("./db.cjs");

const { getRoomOwnerData, getMessages, persistMessage, updateRoomOnCandidateJoin } = require("./room.service.cjs");
const { saveSnapshot, saveEvent } = require("./interview.service.cjs");

// ─── Redis setup ──────────────────────────────────────────────────────────────
const redisOptions = {
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 15000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) return false; // Stop reconnecting after 10 attempts
      const delay = Math.min(retries * 1000, 10000); // Exponential backoff, max 10s
      logger.warn({ retries, delay }, "[redis] reconnecting");
      return delay;
    },
  },
};

const pubClient = createClient(redisOptions);
const subClient = pubClient.duplicate();

// Enhanced error handling with reconnection logic
pubClient.on("error", (err) => {
  logger.error({ err: { message: err.message, code: err.code } }, "[redis] pub error");
  if (err.code === "ENETUNREACH" || err.code === "ECONNREFUSED") {
    logger.warn("[redis] network unreachable, will retry connection");
  }
});

subClient.on("error", (err) => {
  logger.error({ err: { message: err.message, code: err.code } }, "[redis] sub error");
  if (err.code === "ENETUNREACH" || err.code === "ECONNREFUSED") {
    logger.warn("[redis] network unreachable, will retry connection");
  }
});

pubClient.on("connect", () => logger.info("[redis] pub client connected"));
subClient.on("connect", () => logger.info("[redis] sub client connected"));
pubClient.on("ready", () => logger.info("[redis] pub client ready"));
subClient.on("ready", () => logger.info("[redis] sub client ready"));
pubClient.on("reconnecting", () => logger.info("[redis] pub client reconnecting"));
subClient.on("reconnecting", () => logger.info("[redis] sub client reconnecting"));

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // List of allowed origins
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        "http://localhost:3000",
        "https://localhost:3000",
        // Production URLs
        "https://codroom-two.vercel.app",
        "https://codroom-socket.onrender.com",
        // Vercel preview URLs
        /\.vercel\.app$/,
        /\.render\.com$/,
        /\.netlify\.app$/,
      ].filter(Boolean);
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: false,
});

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "codroom-token";

let roomState;
const snapshotTimers = new Map();

// Periodic cleanup of orphaned snapshot timers
setInterval(() => {
  const now = Date.now();
  for (const [key, timer] of snapshotTimers.entries()) {
    // Check if the timer is older than 5 minutes (stale)
    if (timer._idleStart && (now - timer._idleStart) > 300000) {
      clearTimeout(timer);
      snapshotTimers.delete(key);
      logger.warn({ timerKey: key }, "cleaned up stale snapshot timer");
    }
  }
}, 60000); // Run cleanup every minute

// ─── Per-socket rate limiter ──────────────────────────────────────────────────
const rateBuckets = new Map(); // in-memory fallback only

const RATE_LIMITS = {
  "code-change":      { capacity: 20, refillRate: 10 }, // Reduced from 50/30
  "send-message":     { capacity: 15, refillRate:  3 },
  "timeline-event":   { capacity: 30, refillRate: 15 },
  "join-room":        { capacity:  5, refillRate:  2 },
  "language-change":  { capacity: 10, refillRate:  2 },
  "whiteboard-draw":  { capacity: 50, refillRate: 30 }, // Reduced from 80/50
  "whiteboard-clear": { capacity: 10, refillRate:  2 },
  "timer-set":        { capacity:  5, refillRate:  1 },
  "timer-extend":     { capacity: 10, refillRate:  2 },
  "timer-clear":      { capacity:  5, refillRate:  1 },
  "set-focus-mode":   { capacity:  5, refillRate:  1 },
  "set-interview-id": { capacity:  3, refillRate:  1 },
  "unlock-candidate": { capacity: 10, refillRate:  2 },
  "cursor-move":      { capacity: 30, refillRate: 20 }, // New rate limit for cursor events
};

// Lua script: atomic token-bucket refill + consume
const TOKEN_BUCKET_SCRIPT = `
  local tokens    = tonumber(redis.call('HGET', KEYS[1], 't') or ARGV[1])
  local lastMs    = tonumber(redis.call('HGET', KEYS[1], 'l') or ARGV[4])
  local capacity  = tonumber(ARGV[1])
  local rate      = tonumber(ARGV[2])
  local now       = tonumber(ARGV[4])
  local elapsed   = (now - lastMs) / 1000
  tokens = math.min(capacity, tokens + elapsed * rate)
  if tokens < 1 then
    redis.call('HMSET', KEYS[1], 't', tokens, 'l', now)
    redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]))
    return 0
  end
  tokens = tokens - 1
  redis.call('HMSET', KEYS[1], 't', tokens, 'l', now)
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]))
  return 1
`;

// pubClient is available after start() — passed in via initRateLimiter
let rlRedis = null;
function initRateLimiter(client) { rlRedis = client; }

async function isAllowed(socketId, event) {
  const limits = RATE_LIMITS[event];
  if (!limits) return true;

  // Redis path
  if (rlRedis?.isReady) {
    try {
      const key = `srl:${socketId}:${event}`;
      const ttlMs = Math.ceil((limits.capacity / limits.refillRate) * 2000);
      const result = await rlRedis.eval(TOKEN_BUCKET_SCRIPT, {
        keys: [key],
        arguments: [String(limits.capacity), String(limits.refillRate), String(ttlMs), String(Date.now())],
      });
      return result === 1;
    } catch {
      // fall through to in-memory
    }
  }

  // In-memory fallback
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
  } catch (err) {
    console.warn(`[socket] Auth error: ${err.message}`);
    socket.data.user = null;
    socket.data.isAuthenticated = false;
    next();
  }
});

// Returns socket.data.roomId if it matches the payload roomId, otherwise null.
function boundRoom(socket, payloadRoomId) {
  const bound = socket.data.roomId;
  if (!bound || bound !== payloadRoomId) return null;
  return bound;
}

async function getRoomOwnerIdFromDB(roomId) {
  try {
    const data = await getRoomOwnerData(roomId);
    return data?.createdById || null;
  } catch {
    return null;
  }
}

// ─── Connection handler ───────────────────────────────────────────────────────
/**
 * SECURITY MODEL:
 * 
 * 1. Authentication: All sockets go through JWT auth middleware. Authenticated users
 *    get socket.data.user populated. Unauthenticated users can still join with room tickets.
 * 
 * 2. Room Authorization: Users must join a room before performing any room actions.
 *    - Room owners: Verified via JWT userId matching room.createdById
 *    - Candidates: Verified via room-ticket JWT containing roomId + type="room-session"
 * 
 * 3. Event Authorization: Every event handler verifies:
 *    - socket.data.roomId matches the roomId in the event payload (prevents cross-room attacks)
 *    - Role-based permissions (interviewer-only events check socket.data.role === "interviewer")
 * 
 * 4. Input Sanitization: All user inputs (names, messages) are sanitized to prevent XSS
 * 
 * 5. Rate Limiting: Per-socket token bucket rate limiting prevents abuse
 */
io.on("connection", (socket) => {
  const slog = createSocketLogger(socket);
  slog.debug({ auth: socket.data.isAuthenticated }, "socket connected");

  // Join authenticated users to dashboard room for room count updates
  if (socket.data.isAuthenticated) {
    socket.join("dashboard");
    slog.debug("joined dashboard room for count updates");
  }

  socket.on("join-room", async ({ roomId, userName, role: clientRole }) => {
    if (!roomId || !userName) {
      socket.emit("join-error", { message: "Missing roomId or userName" });
      return;
    }
    if (!await isAllowed(socket.id, "join-room")) {
      socket.emit("join-error", { message: "Rate limit exceeded" });
      return;
    }

    // Sanitize user input
    userName = sanitizeName(userName);
    if (!userName) return;

    let authoritativeRole = "candidate";

    if (socket.data.isAuthenticated && socket.data.user) {
      const ownerId = await getRoomOwnerIdFromDB(roomId);
      if (!ownerId) {
        console.error("Room not found in getRoomOwnerIdFromDB for roomId:", roomId);
        socket.emit("join-error", { message: "Room not found" });
        return;
      }
      if (ownerId === socket.data.user.userId) {
        authoritativeRole = "interviewer";
      } else {
        const ticket = socket.handshake.auth?.roomTicket;
        if (!ticket) { 
          console.error(`[join-room] No room ticket for authenticated guest. User: ${socket.data.user.userId}, Room: ${roomId}`);
          socket.emit("join-error", { message: "No room ticket" }); 
          return; 
        }
        try {
          const { payload } = await jwtVerify(ticket, SECRET);
          if (payload.roomId !== roomId) {
            console.error(`[join-room] Room ID mismatch for authenticated guest. Expected: ${roomId}, Got: ${payload.roomId}`);
            throw new Error("Room ID mismatch");
          }
          if (payload.type !== "room-session") {
            console.error(`[join-room] Invalid ticket type for authenticated guest. Expected: room-session, Got: ${payload.type}`);
            throw new Error("Invalid ticket type");
          }
        } catch(err) {
          console.error(`[join-room] Invalid room ticket for authenticated guest: ${err.message}. User: ${socket.data.user.userId}`);
          socket.emit("join-error", { message: "Invalid room ticket" });
          return;
        }
      }
    } else {
      const ticket = socket.handshake.auth?.roomTicket;
      if (!ticket) { 
        console.error(`[join-room] No room ticket for unauthenticated user. Socket: ${socket.id}, Room: ${roomId}`);
        socket.emit("join-error", { message: "No room ticket provided" }); 
        return; 
      }
      try {
        const { payload } = await jwtVerify(ticket, SECRET);
        if (payload.roomId !== roomId) {
          console.error(`[join-room] Room ID mismatch. Expected: ${roomId}, Got: ${payload.roomId}`);
          throw new Error("Room ID mismatch");
        }
        if (payload.type !== "room-session") {
          console.error(`[join-room] Invalid ticket type. Expected: room-session, Got: ${payload.type}`);
          throw new Error("Invalid ticket type");
        }
        if (payload.candidateName) userName = sanitizeName(payload.candidateName);
      } catch(err) {
        console.error(`[join-room] Invalid room ticket for unauthenticated user: ${err.message}. Socket: ${socket.id}`);
        socket.emit("join-error", { message: "Invalid room ticket" });
        return;
      }
    }

    socket.data.roomId = roomId;
    socket.data.userName = userName;
    socket.data.role = authoritativeRole;
    socket.join(roomId);

    // Init room in Redis if it doesn't exist yet
    let room;
    try {
      room = await roomState.getRoomState(roomId);
      if (!room) {
        const dbData = await seedRoomFromDB(roomId);
        if (!dbData) {
          console.error("Room not found in seedRoomFromDB for roomId:", roomId);
          socket.emit("join-error", { message: "Room not found" });
          return;
        }
        
        // Clear any existing snapshot timer for this room before initializing
        const timerKey = `${roomId}-snapshot`;
        if (snapshotTimers.has(timerKey)) {
          clearTimeout(snapshotTimers.get(timerKey));
          snapshotTimers.delete(timerKey);
          slog.debug({ roomId }, "cleared stale snapshot timer on room init");
        }
        
        await roomState.initRoom(roomId, {
          code: dbData.lastCode || "",
          language: dbData.language || "javascript",
          users: [],
          messages: dbData.persistedMessages || [],
          events: [],
          interviewId: dbData.interviewId || null,
        });
        room = await roomState.getRoomState(roomId);
      }
    } catch (error) {
      console.error("Error initializing room state:", error.message);
      socket.emit("join-error", { message: "Room initialization failed" });
      return;
    }

    const users = await roomState.upsertUser(roomId, {
      id: socket.id, name: userName, role: authoritativeRole,
    });

    slog.info({ roomId, userName, role: authoritativeRole }, "user joined room");

    if (authoritativeRole === "candidate") {
      updateRoomOnCandidateJoin(roomId, userName)
        .then(({ wasFirstJoin }) => {
          if (wasFirstJoin) {
            // Notify interviewer via internal API (fire-and-forget)
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            fetch(`${appUrl}/api/internal/notify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-secret": process.env.INTERNAL_SECRET || "",
              },
              body: JSON.stringify({ type: "candidate-joined", roomId, candidateName: userName }),
            }).catch((err) => slog.warn({ err, roomId }, "candidate-joined notify failed"));
          }
        })
        .catch((err) => slog.error({ err, roomId }, "DB update error on candidate join"));
    }

    socket.emit("room-state", {
      code: room?.code || "",
      language: room?.language || "javascript",
      users,
      messages: room?.messages?.slice(-200) || [],
      interviewId: room?.interviewId || null,
      events: room?.events || [],
      focusMode: room?.focusMode || false,
      timerEndsAt: room?.timerEndsAt || null,
      isEmptyRoom: users.length === 1 && !room?.code && !room?.interviewId,
    });

    socket.to(roomId).emit("user-joined", {
      user: users.find((u) => u.id === socket.id),
      users,
    });

    // Only broadcast room count updates to authenticated dashboard users
    socket.broadcast.to("dashboard").emit("room-count-update", { roomId, count: users.length });

    const joinMsg = {
      id: `${Date.now()}-${socket.id}`,
      sender: "System",
      role: "system",
      text: `${userName} joined the room`,
      timestamp: new Date().toISOString(),
    };
    await roomState.pushMessage(roomId, joinMsg);
    io.to(roomId).emit("chat-message", joinMsg);
    persistMessage(roomId, joinMsg).catch((err) =>
      slog.error({ err, roomId }, "chat persist error on join")
    );
  });

  socket.on("get-room-counts", async (roomIds) => {
    if (!socket.data.isAuthenticated) return;
    if (!Array.isArray(roomIds) || roomIds.length === 0 || roomIds.length > 50) return;
    if (roomIds.some((id) => typeof id !== "string" || id.length > 128)) return;

    const counts = {};
    await Promise.all(
      roomIds.map(async (id) => {
        const room = await roomState.getRoomState(id);
        counts[id] = room?.users?.length || 0;
      })
    );
    socket.emit("room-counts-snapshot", counts);
  });

  socket.on("timer-set", async ({ roomId: rid, durationMinutes }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "timer-set")) return;
    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    await roomState.setTimer(roomId, endsAt);
    io.to(roomId).emit("timer-sync", { endsAt });
    slog.info({ roomId, durationMinutes }, "timer set");
  });

  socket.on("timer-extend", async ({ roomId: rid, addMinutes }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "timer-extend")) return;
    const current = await roomState.getTimerEndsAt(roomId);
    const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
    const endsAt = new Date(base.getTime() + addMinutes * 60 * 1000).toISOString();
    await roomState.setTimer(roomId, endsAt);
    io.to(roomId).emit("timer-sync", { endsAt });
    slog.info({ roomId, addMinutes }, "timer extended");
  });

  socket.on("timer-clear", async ({ roomId: rid }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "timer-clear")) return;
    await roomState.setTimer(roomId, null);
    io.to(roomId).emit("timer-sync", { endsAt: null });
  });

  socket.on("set-focus-mode", async ({ roomId: rid, enabled }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "set-focus-mode")) return;
    await roomState.setFocusMode(roomId, !!enabled);
    io.to(roomId).emit("focus-mode-changed", { enabled: !!enabled });
    slog.info({ roomId, enabled: !!enabled }, "focus mode changed");
  });

  socket.on("unlock-candidate", async ({ roomId: rid }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "unlock-candidate")) return;
    io.to(roomId).emit("candidate-unlocked");
    slog.info({ roomId }, "candidate unlocked");
  });

  socket.on("set-interview-id", async ({ roomId: rid, interviewId }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "set-interview-id")) return;
    await roomState.setInterviewId(roomId, interviewId);
    slog.info({ roomId, interviewId }, "interview started");
    io.to(roomId).emit("interview-started", { interviewId });
  });

  socket.on("share-peer-id", async ({ roomId: rid, peerId }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId) return;
    
    const { found } = await roomState.updatePeerId(roomId, socket.id, peerId);
    if (found) {
      io.to(roomId).emit("peer-id-received", { peerId, socketId: socket.id });
    }
  });

  socket.on("code-change", async ({ roomId: rid, code }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !await isAllowed(socket.id, "code-change")) return;
    const room = await roomState.getRoomState(roomId);
    if (!room) return;

    await roomState.updateCode(roomId, code);

    if (room.interviewId) {
      const timerKey = `${roomId}-snapshot`;
      // Clear any existing timer to prevent multiple timers for the same room
      if (snapshotTimers.has(timerKey)) {
        clearTimeout(snapshotTimers.get(timerKey));
      }
      
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

  socket.on("language-change", async ({ roomId: rid, language }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !await isAllowed(socket.id, "language-change")) return;
    const room = await roomState.getRoomState(roomId);
    if (!room) return;
    await roomState.updateLanguage(roomId, language);
    if (room.interviewId) {
      const e = { type: "language_change", label: language, timestamp: new Date().toISOString() };
      await roomState.pushEvent(roomId, e);
      saveEvent(room.interviewId, e.type, e.label);
    }
    socket.to(roomId).emit("language-update", { language });
  });

  socket.on("code-output", async ({ roomId: rid, output }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !socket.data.isAuthenticated) return;
    // Only interviewers can broadcast code execution results
    if (socket.data.role !== "interviewer") return;
    const room = await roomState.getRoomState(roomId);
    if (!room) return;
    if (room.interviewId) {
      const event = {
        type: output.status === "error" ? "run_fail" : "run_pass",
        timestamp: new Date().toISOString(),
        label: output.status === "error" ? "Run Failed" : "Run Passed",
      };
      await roomState.pushEvent(roomId, event);
      saveEvent(room.interviewId, event.type, event.label);
    }
    socket.to(roomId).emit("output-update", { output });
  });

  socket.on("timeline-event", async ({ roomId: rid, event }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !socket.data.isAuthenticated) return;
    // Only interviewers can create timeline events
    if (socket.data.role !== "interviewer") return;
    if (!await isAllowed(socket.id, "timeline-event")) return;
    const room = await roomState.getRoomState(roomId);
    if (!room || !room.interviewId) return;
    const e = { ...event, timestamp: new Date().toISOString() };
    await roomState.pushEvent(roomId, e);
    io.to(roomId).emit("timeline-event", e);
    saveEvent(room.interviewId, e.type, e.label);
  });

  socket.on("whiteboard-draw", async ({ roomId: rid, stroke }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !await isAllowed(socket.id, "whiteboard-draw")) return;
    if (!stroke || typeof stroke !== "object" || Array.isArray(stroke)) return;
    const strokeJson = JSON.stringify(stroke);
    if (strokeJson.length > 4096) return;
    const room = await roomState.getRoomState(roomId);
    if (!room) return;
    socket.to(roomId).emit("whiteboard-draw", { stroke });
  });

  socket.on("whiteboard-clear", async ({ roomId: rid }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !await isAllowed(socket.id, "whiteboard-clear")) return;
    const room = await roomState.getRoomState(roomId);
    if (!room) return;
    io.to(roomId).emit("whiteboard-clear");
  });

  socket.on("cursor-move", ({ roomId: rid, cursor }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId) return;
    // Rate limit cursor movements to prevent flooding
    if (!isAllowed(socket.id, "cursor-move")) return;
    socket.to(roomId).emit("remote-cursor", {
      cursor,
      userId: socket.id,
      userName: socket.data.userName || "?",
      role: socket.data.role || "candidate",
    });
  });

  socket.on("camera-toggle", ({ roomId: rid, isOff }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId) return;
    socket.to(roomId).emit("remote-camera-toggle", { isOff });
  });

  socket.on("mic-toggle", ({ roomId: rid, isMuted }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId) return;
    socket.to(roomId).emit("remote-mic-toggle", { isMuted });
  });

  socket.on("send-message", async ({ roomId: rid, text }) => {
    const roomId = boundRoom(socket, rid);
    if (!roomId || !await isAllowed(socket.id, "send-message")) return;
    const room = await roomState.getRoomState(roomId);
    if (!room || !text?.trim()) return;

    const message = {
      id: `${Date.now()}-${socket.id}`,
      sender: socket.data.userName || "Anonymous",
      role: socket.data.role || "candidate",
      text: sanitizeText(text.trim(), 2000),
      timestamp: new Date().toISOString(),
    };

    await roomState.pushMessage(roomId, message);
    io.to(roomId).emit("chat-message", message);
    persistMessage(roomId, message).catch((err) =>
      console.error("[chat] persist error:", err.message)
    );
  });

  socket.on("disconnect", async () => {
    slog.debug("socket disconnected");
    rateBuckets.delete(socket.id);
    // Clean up Redis token-bucket keys for this socket
    if (rlRedis?.isReady) {
      const keys = Object.keys(RATE_LIMITS).map((e) => `srl:${socket.id}:${e}`);
      rlRedis.del(keys).catch(() => {});
    }

    const roomId = socket.data.roomId;
    if (!roomId) return;

    const { removed: user, users } = await roomState.removeUser(roomId, socket.id);
    if (!user) return;

    io.to(roomId).emit("user-left", { user, users });
    // Only broadcast room count updates to authenticated dashboard users
    socket.broadcast.to("dashboard").emit("room-count-update", { roomId, count: users.length });

    const leaveMsg = {
      id: `${Date.now()}-${socket.id}`,
      sender: "System",
      role: "system",
      text: `${user.name} left the room`,
      timestamp: new Date().toISOString(),
    };
    await roomState.pushMessage(roomId, leaveMsg);
    io.to(roomId).emit("chat-message", leaveMsg);
    persistMessage(roomId, leaveMsg).catch((err) =>
      slog.error({ err, roomId }, "chat persist error on leave")
    );

    slog.info({ roomId, userName: user.name }, "user left room");

    if (users.length === 0) {
      const timerKey = `${roomId}-snapshot`;
      if (snapshotTimers.has(timerKey)) {
        clearTimeout(snapshotTimers.get(timerKey));
        snapshotTimers.delete(timerKey);
      }
      await roomState.deleteRoom(roomId);
      slog.info({ roomId }, "room cleaned up (empty)");
    }
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);

async function start() {
  try {
    logger.info("Connecting to Redis...");
    await Promise.all([
      pubClient.connect().catch(err => {
        logger.error({ err: { message: err.message, code: err.code } }, "[redis] pub client connection failed");
        throw err;
      }),
      subClient.connect().catch(err => {
        logger.error({ err: { message: err.message, code: err.code } }, "[redis] sub client connection failed");
        throw err;
      })
    ]);
    
    io.adapter(createAdapter(pubClient, subClient));
    roomState = new RoomStateManager(pubClient);
    initRateLimiter(pubClient);
    logger.info("Redis connected successfully");
  } catch (err) {
    logger.error({ err: { message: err.message, code: err.code } }, "Redis connection failed, continuing without Redis adapter");
    // Continue without Redis adapter - Socket.IO will work in single-instance mode
    roomState = new RoomStateManager(null); // Pass null for Redis client
    initRateLimiter(null);
  }

  httpServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.fatal({ port: PORT }, "port already in use");
      process.exit(1);
    } else {
      throw err;
    }
  });

  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, "socket.io server started");
  });
}

start().catch((err) => {
  logger.fatal({ err }, "failed to start socket server");
  process.exit(1);
});

async function shutdown(signal) {
  logger.info({ signal }, "shutting down");
  
  // Close HTTP server first
  await new Promise((resolve) => httpServer.close(resolve));
  
  // Disconnect all sockets gracefully
  await new Promise((resolve) => {
    io.disconnectSockets(true);
    // Give sockets time to disconnect before closing Redis
    setTimeout(resolve, 100);
  });
  
  // Clear all timers
  for (const [key, timer] of snapshotTimers) {
    clearTimeout(timer);
    snapshotTimers.delete(key);
  }
  
  // Close Redis connections only if they're still open
  // Socket.IO adapter may have already closed them
  try {
    if (pubClient?.isOpen) {
      await pubClient.quit();
    }
    if (subClient?.isOpen) {
      await subClient.quit();
    }
  } catch (err) {
    // Ignore "client is closed" errors during shutdown
    if (err.message !== "The client is closed") {
      logger.warn({ err }, "Error closing Redis connections");
    }
  }
  
  await prisma.$disconnect();
  logger.info("shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
  logger.error({ err: reason }, "unhandledRejection");
});
