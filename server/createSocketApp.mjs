/**
 * Testable factory: creates the Socket.IO server without connecting Redis,
 * starting the HTTP listener, or calling process.exit.
 *
 * @param {object} opts
 * @param {import('./roomStateManager.mjs').RoomStateManager} opts.roomState
 * @param {object} opts.services  - { getRoomOwnerData, getMessages, persistMessage, updateRoom, saveSnapshot, saveEvent }
 * @param {string} opts.jwtSecret
 * @returns {{ io: import('socket.io').Server, httpServer: import('http').Server }}
 */
import { createServer } from "http";
import { Server } from "socket.io";
import { jwtVerify } from "jose";
import { sanitizeName, sanitizeText } from "./utils.cjs";

export function createSocketApp({ roomState, services, jwtSecret }) {
  const SECRET = new TextEncoder().encode(jwtSecret);
  const COOKIE_NAME = "codroom-token";

  const {
    getRoomOwnerData,
    getMessages,
    persistMessage,
    updateRoom,
    saveSnapshot,
    saveEvent,
  } = services;

  const snapshotTimers = new Map();

  const RATE_LIMITS = {
    "code-change": { capacity: 20, refillRate: 10 },
    "send-message": { capacity: 15, refillRate: 3 },
    "join-room": { capacity: 5, refillRate: 2 },
    "language-change": { capacity: 10, refillRate: 2 },
    "whiteboard-draw": { capacity: 50, refillRate: 30 },
    "whiteboard-clear": { capacity: 10, refillRate: 2 },
    "timer-set": { capacity: 5, refillRate: 1 },
    "timer-extend": { capacity: 10, refillRate: 2 },
    "timer-clear": { capacity: 5, refillRate: 1 },
    "set-focus-mode": { capacity: 5, refillRate: 1 },
    "set-interview-id": { capacity: 3, refillRate: 1 },
    "unlock-candidate": { capacity: 10, refillRate: 2 },
    "cursor-move": { capacity: 30, refillRate: 20 },
    "timeline-event": { capacity: 30, refillRate: 15 },
  };

  const rateBuckets = new Map();

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

  async function seedRoomFromDB(roomId) {
    try {
      const [data, messages] = await Promise.all([
        getRoomOwnerData(roomId),
        getMessages(roomId, 200),
      ]);
      const lastCode = data?.interview?.snapshots?.[0]?.code || "";
      const interviewId =
        data?.interview?.status === "in_progress" ? data.interview.id : null;
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

  async function updateRoomOnCandidateJoin(roomId, candidateName) {
    const room = await getRoomOwnerData(roomId);
    if (!room) return { wasFirstJoin: false };
    const data = {};
    const wasFirstJoin = room.status === "waiting";
    if (room.status === "waiting") data.status = "active";
    if (!room.candidateName && candidateName) data.candidateName = candidateName;
    if (Object.keys(data).length > 0) await updateRoom(roomId, data);
    return { wasFirstJoin };
  }

  const httpServer = createServer();

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // Auth middleware
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

  function boundRoom(socket, payloadRoomId) {
    const bound = socket.data.roomId;
    if (!bound || bound !== payloadRoomId) return null;
    return bound;
  }

  io.on("connection", (socket) => {
    if (socket.data.isAuthenticated) socket.join("dashboard");

    socket.on("join-room", async ({ roomId, userName, role: _clientRole }) => {
      if (!roomId || !userName) {
        socket.emit("join-error", { message: "Missing roomId or userName" });
        return;
      }
      if (!isAllowed(socket.id, "join-room")) {
        socket.emit("join-error", { message: "Rate limit exceeded. Please slow down." });
        return;
      }

      userName = sanitizeName(userName);
      if (!userName) return;

      let authoritativeRole = "candidate";

      if (socket.data.isAuthenticated && socket.data.user) {
        const data = await getRoomOwnerData(roomId);
        if (!data) { socket.emit("join-error", { message: "Room not found" }); return; }
        if (data.createdById === socket.data.user.userId) {
          authoritativeRole = "interviewer";
        } else {
          const ticket = socket.handshake.auth?.roomTicket;
          if (!ticket) { socket.emit("join-error", { message: "No room ticket" }); return; }
          try {
            const { payload } = await jwtVerify(ticket, SECRET);
            if (payload.roomId !== roomId || payload.type !== "room-session") throw new Error();
          } catch {
            socket.emit("join-error", { message: "Invalid room ticket" }); return;
          }
        }
      } else {
        const ticket = socket.handshake.auth?.roomTicket;
        if (!ticket) { socket.emit("join-error", { message: "No room ticket provided" }); return; }
        try {
          const { payload } = await jwtVerify(ticket, SECRET);
          if (payload.roomId !== roomId || payload.type !== "room-session") throw new Error();
          if (payload.candidateName) userName = sanitizeName(payload.candidateName) || userName;
        } catch {
          socket.emit("join-error", { message: "Invalid room ticket" }); return;
        }
      }

      // Evict duplicate connections
      const existingUsers = (await roomState.getRoomUsers(roomId)) || [];
      for (const dup of existingUsers.filter(
        (u) => u && u.name === userName && u.role === authoritativeRole && u.id !== socket.id
      )) {
        await roomState.removeUser(roomId, dup.id);
        io.to(dup.id).emit("force-disconnect", { reason: "duplicate-connection" });
        io.sockets.sockets.get(dup.id)?.disconnect(true);
      }

      socket.data.roomId = roomId;
      socket.data.userName = userName;
      socket.data.role = authoritativeRole;
      socket.join(roomId);

      let room;
      try {
        room = await roomState.getRoomState(roomId);
        if (!room) {
          const dbData = await seedRoomFromDB(roomId);
          if (!dbData) { socket.emit("join-error", { message: "Room not found" }); return; }
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
      } catch {
        socket.emit("join-error", { message: "Room initialization failed" }); return;
      }

      const users = await roomState.upsertUser(roomId, {
        id: socket.id, name: userName, role: authoritativeRole,
      });

      if (authoritativeRole === "candidate") {
        updateRoomOnCandidateJoin(roomId, userName).catch(() => {});
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

      socket.to(roomId).emit("user-joined", { user: users.find((u) => u.id === socket.id), users });
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
      persistMessage(roomId, joinMsg).catch(() => {});
    });

    socket.on("code-change", async ({ roomId: rid, code }) => {
      const roomId = boundRoom(socket, rid);
      if (!roomId || !isAllowed(socket.id, "code-change")) return;
      const room = await roomState.getRoomState(roomId);
      if (!room) return;
      await roomState.updateCode(roomId, code);
      if (room.interviewId) {
        const timerKey = `${roomId}-snapshot`;
        if (snapshotTimers.has(timerKey)) clearTimeout(snapshotTimers.get(timerKey));
        snapshotTimers.set(timerKey, setTimeout(() => {
          saveSnapshot(room.interviewId, code);
          snapshotTimers.delete(timerKey);
        }, 1000));
      }
      socket.to(roomId).emit("code-update", { code });
    });

    socket.on("send-message", async ({ roomId: rid, text }) => {
      const roomId = boundRoom(socket, rid);
      if (!roomId || !isAllowed(socket.id, "send-message")) return;
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
      persistMessage(roomId, message).catch(() => {});
    });

    socket.on("language-change", async ({ roomId: rid, language }) => {
      const roomId = boundRoom(socket, rid);
      if (!roomId || !isAllowed(socket.id, "language-change")) return;
      const room = await roomState.getRoomState(roomId);
      if (!room) return;
      await roomState.updateLanguage(roomId, language);
      if (room.interviewId) {
        const e = { type: "language_change", label: language, timestamp: new Date().toISOString() };
        await roomState.pushEvent(roomId, e);
        saveEvent(room.interviewId, { type: e.type, label: e.label });
      }
      socket.to(roomId).emit("language-update", { language });
    });

    socket.on("set-interview-id", async ({ roomId: rid, interviewId }) => {
      const roomId = boundRoom(socket, rid);
      if (!roomId || socket.data.role !== "interviewer") return;
      if (!isAllowed(socket.id, "set-interview-id")) return;
      await roomState.setInterviewId(roomId, interviewId);
      io.to(roomId).emit("interview-started", { interviewId });
    });

    socket.on("disconnect", async () => {
      rateBuckets.delete(socket.id);
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const { removed: user, users } = await roomState.removeUser(roomId, socket.id);
      if (!user) return;
      io.to(roomId).emit("user-left", { user, users });
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
      persistMessage(roomId, leaveMsg).catch(() => {});
      if (users.length === 0) {
        const timerKey = `${roomId}-snapshot`;
        if (snapshotTimers.has(timerKey)) { clearTimeout(snapshotTimers.get(timerKey)); snapshotTimers.delete(timerKey); }
        await roomState.deleteRoom(roomId);
      }
    });
  });

  return { io, httpServer };
}
