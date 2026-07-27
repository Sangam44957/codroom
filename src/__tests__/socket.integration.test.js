"use strict";
/**
 * @jest-environment node
 *
 * Real Socket.IO integration tests — no mocks for the socket layer.
 * Uses createSocketApp.cjs factory with an in-memory RoomStateManager stub
 * and stubbed DB services so no Redis or Postgres is needed.
 */

const { createSocketApp } = require("../../server/createSocketApp.js");
const { io: ioc } = require("socket.io-client");
const { SignJWT } = require("jose");

// ─── In-memory RoomStateManager ──────────────────────────────────────────────
class MemoryRoomState {
  constructor() { this._rooms = new Map(); }
  _get(id) { return this._rooms.get(id) || null; }
  async getRoomState(id) { return this._get(id); }
  async initRoom(id, state) {
    if (this._rooms.has(id)) return false;
    this._rooms.set(id, {
      code: state.code || "",
      language: state.language || "javascript",
      users: [...(state.users || [])],
      messages: [...(state.messages || [])],
      events: [...(state.events || [])],
      interviewId: state.interviewId || null,
      focusMode: false,
      timerEndsAt: null,
    });
    return true;
  }
  async getRoomUsers(id) { return this._get(id)?.users || []; }
  async upsertUser(id, user) {
    const r = this._get(id);
    if (!r) return [user];
    const idx = r.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) r.users[idx] = user; else r.users.push(user);
    return [...r.users];
  }
  async removeUser(id, socketId) {
    const r = this._get(id);
    if (!r) return { removed: null, users: [] };
    const idx = r.users.findIndex((u) => u.id === socketId);
    if (idx < 0) return { removed: null, users: [...r.users] };
    const [removed] = r.users.splice(idx, 1);
    return { removed, users: [...r.users] };
  }
  async updateCode(id, code) { const r = this._get(id); if (r) r.code = code; }
  async updateLanguage(id, lang) { const r = this._get(id); if (r) r.language = lang; }
  async pushMessage(id, msg) { const r = this._get(id); if (r) r.messages.push(msg); }
  async pushEvent(id, ev) { const r = this._get(id); if (r) r.events.push(ev); }
  async setInterviewId(id, iid) { const r = this._get(id); if (r) r.interviewId = iid || null; }
  async setFocusMode(id, v) { const r = this._get(id); if (r) r.focusMode = !!v; }
  async setTimer(id, v) { const r = this._get(id); if (r) r.timerEndsAt = v || null; }
  async getTimerEndsAt(id) { return this._get(id)?.timerEndsAt || null; }
  async deleteRoom(id) { this._rooms.delete(id); }
  async updatePeerId(id, socketId, peerId) {
    const r = this._get(id);
    if (!r) return { found: false };
    const u = r.users.find((u) => u.id === socketId);
    if (u) { u.peerId = peerId; return { found: true }; }
    return { found: false };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const JWT_SECRET = "test-secret-that-is-long-enough-for-hs256-abc";
const SECRET = new TextEncoder().encode(JWT_SECRET);
const ROOM_ID = "room-test-001";
const OWNER_ID = "user-owner-001";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeInterviewerToken() {
  return new SignJWT({ userId: OWNER_ID })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(SECRET);
}

function makeRoomTicket(roomId = ROOM_ID, candidateName = "Alice") {
  return new SignJWT({ roomId, type: "room-session", candidateName })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(SECRET);
}

function once(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

// ─── Test suite ──────────────────────────────────────────────────────────────
describe("Socket.IO integration", () => {
  let httpServer, io, roomState, services, port;
  const sockets = [];

  function stubServices() {
    return {
      getRoomOwnerData: jest.fn().mockResolvedValue({
        createdById: OWNER_ID,
        language: "javascript",
        status: "waiting",
        candidateName: null,
        interview: null,
      }),
      getMessages: jest.fn().mockResolvedValue([]),
      persistMessage: jest.fn().mockResolvedValue({}),
      updateRoom: jest.fn().mockResolvedValue({}),
      saveSnapshot: jest.fn().mockResolvedValue({}),
      saveEvent: jest.fn().mockResolvedValue({}),
    };
  }

  function connect(opts = {}) {
    return ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
      ...opts,
    });
  }

  beforeEach(async () => {
    roomState = new MemoryRoomState();
    services = stubServices();
    ({ io, httpServer } = createSocketApp({ roomState, services, jwtSecret: JWT_SECRET }));
    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
  });

  afterEach(async () => {
    for (const s of sockets.splice(0)) s.disconnect();
    await new Promise((resolve) => { io.disconnectSockets(true); io.close(resolve); });
  });

  // ── 1. join-room → room-state ─────────────────────────────────────────────
  test("interviewer join-room receives room-state", async () => {
    const token = await makeInterviewerToken();
    const client = connect({ auth: { token } });
    sockets.push(client);

    await once(client, "connect");
    client.emit("join-room", { roomId: ROOM_ID, userName: "Interviewer" });

    const state = await once(client, "room-state");
    expect(state.language).toBe("javascript");
    expect(Array.isArray(state.users)).toBe(true);
    expect(state.users[0].role).toBe("interviewer");
  });

  // ── 2. second client receives user-joined ────────────────────────────────
  test("second client receives user-joined when interviewer joins", async () => {
    const ticket = await makeRoomTicket();
    const c1 = connect({ auth: { roomTicket: ticket } });
    sockets.push(c1);
    await once(c1, "connect");
    c1.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    await once(c1, "room-state");

    const token = await makeInterviewerToken();
    const c2 = connect({ auth: { token } });
    sockets.push(c2);
    await once(c2, "connect");

    const userJoinedPromise = once(c1, "user-joined");
    c2.emit("join-room", { roomId: ROOM_ID, userName: "Interviewer" });
    await once(c2, "room-state");

    const { users } = await userJoinedPromise;
    expect(users).toHaveLength(2);
    expect(users.map((u) => u.role).sort()).toEqual(["candidate", "interviewer"]);
  });

  // ── 3. code-change syncs to other client ─────────────────────────────────
  test("code-change broadcasts code-update to other client", async () => {
    const ticket = await makeRoomTicket();
    const token = await makeInterviewerToken();
    const c1 = connect({ auth: { roomTicket: ticket } });
    const c2 = connect({ auth: { token } });
    sockets.push(c1, c2);

    await Promise.all([once(c1, "connect"), once(c2, "connect")]);
    c1.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    c2.emit("join-room", { roomId: ROOM_ID, userName: "Interviewer" });
    await Promise.all([once(c1, "room-state"), once(c2, "room-state")]);

    const updatePromise = once(c2, "code-update");
    c1.emit("code-change", { roomId: ROOM_ID, code: "console.log('hello')" });

    const { code } = await updatePromise;
    expect(code).toBe("console.log('hello')");
  });

  // ── 4. concurrent code-change events — both propagate ────────────────────
  test("concurrent code-change events both propagate without deadlock", async () => {
    const ticket = await makeRoomTicket();
    const token = await makeInterviewerToken();
    const c1 = connect({ auth: { roomTicket: ticket } });
    const c2 = connect({ auth: { token } });
    sockets.push(c1, c2);

    await Promise.all([once(c1, "connect"), once(c2, "connect")]);
    c1.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    c2.emit("join-room", { roomId: ROOM_ID, userName: "Interviewer" });
    await Promise.all([once(c1, "room-state"), once(c2, "room-state")]);

    const c1Updates = [];
    const c2Updates = [];
    c1.on("code-update", (d) => c1Updates.push(d.code));
    c2.on("code-update", (d) => c2Updates.push(d.code));

    c1.emit("code-change", { roomId: ROOM_ID, code: "// from c1" });
    c2.emit("code-change", { roomId: ROOM_ID, code: "// from c2" });

    await new Promise((r) => setTimeout(r, 300));
    expect(c1Updates).toContain("// from c2");
    expect(c2Updates).toContain("// from c1");
  });

  // ── 5. send-message → chat-message to all ────────────────────────────────
  test("send-message broadcasts chat-message to all room members", async () => {
    const ticket = await makeRoomTicket();
    const token = await makeInterviewerToken();
    const c1 = connect({ auth: { roomTicket: ticket } });
    const c2 = connect({ auth: { token } });
    sockets.push(c1, c2);

    await Promise.all([once(c1, "connect"), once(c2, "connect")]);
    c1.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    c2.emit("join-room", { roomId: ROOM_ID, userName: "Interviewer" });
    await Promise.all([once(c1, "room-state"), once(c2, "room-state")]);
    await new Promise((r) => setTimeout(r, 100)); // drain join system messages

    const msgOnC2 = once(c2, "chat-message");
    c1.emit("send-message", { roomId: ROOM_ID, text: "Hello!" });

    const msg = await msgOnC2;
    expect(msg.text).toBe("Hello!");
    expect(msg.sender).toBe("Alice");
    expect(msg.role).toBe("candidate");
  });

  // ── 6. disconnect → user-left ────────────────────────────────────────────
  test("disconnect emits user-left to remaining clients", async () => {
    const ticket = await makeRoomTicket();
    const token = await makeInterviewerToken();
    const c1 = connect({ auth: { roomTicket: ticket } });
    const c2 = connect({ auth: { token } });
    sockets.push(c1, c2);

    await Promise.all([once(c1, "connect"), once(c2, "connect")]);
    c1.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    c2.emit("join-room", { roomId: ROOM_ID, userName: "Interviewer" });
    await Promise.all([once(c1, "room-state"), once(c2, "room-state")]);

    const userLeftPromise = once(c2, "user-left");
    c1.disconnect();

    const { user, users } = await userLeftPromise;
    expect(user.name).toBe("Alice");
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Interviewer");
  });

  // ── 7. duplicate connection → force-disconnect ───────────────────────────
  test("duplicate join with same name+role triggers force-disconnect on old socket", async () => {
    const ticket1 = await makeRoomTicket(ROOM_ID, "Alice");
    const ticket2 = await makeRoomTicket(ROOM_ID, "Alice");

    const c1 = connect({ auth: { roomTicket: ticket1 } });
    sockets.push(c1);
    await once(c1, "connect");
    c1.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    await once(c1, "room-state");

    const forceDisconnectPromise = once(c1, "force-disconnect");

    const c2 = connect({ auth: { roomTicket: ticket2 } });
    sockets.push(c2);
    await once(c2, "connect");
    c2.emit("join-room", { roomId: ROOM_ID, userName: "Alice" });
    await once(c2, "room-state");

    const { reason } = await forceDisconnectPromise;
    expect(reason).toBe("duplicate-connection");
  });

  // ── 8. join with missing roomId → join-error ─────────────────────────────
  test("join-room with missing roomId emits join-error", async () => {
    const token = await makeInterviewerToken();
    const client = connect({ auth: { token } });
    sockets.push(client);
    await once(client, "connect");

    client.emit("join-room", { roomId: "", userName: "Interviewer" });
    const err = await once(client, "join-error");
    expect(err.message).toBe("Missing roomId or userName");
  });
});
