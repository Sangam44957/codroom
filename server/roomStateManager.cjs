const CACHE_TTL_MS = 5000;
const ROOM_TTL_S = 86400;

// Atomically initialise a room only if it does not already exist.
// Returns 1 if the room was created, 0 if it already existed.
const INIT_ROOM_SCRIPT = `
  local key = KEYS[1]
  if redis.call('EXISTS', key) == 1 then return 0 end
  redis.call('HSET', key,
    'code',        ARGV[1],
    'language',    ARGV[2],
    'users',       ARGV[3],
    'messages',    ARGV[4],
    'events',      ARGV[5],
    'interviewId', ARGV[6],
    'focusMode',   'false'
  )
  redis.call('EXPIRE', key, ARGV[7])
  return 1
`;

// Atomically append one JSON item to a hash field, capping at maxLen.
const PUSH_ITEM_SCRIPT = `
  local key   = KEYS[1]
  local field = ARGV[1]
  local item  = ARGV[2]
  local max   = tonumber(ARGV[3])
  local raw   = redis.call('HGET', key, field)
  local arr   = cjson.decode(raw or '[]')
  arr[#arr + 1] = cjson.decode(item)
  while #arr > max do table.remove(arr, 1) end
  redis.call('HSET', key, field, cjson.encode(arr))
  return cjson.encode(arr)
`;

// Atomically apply a users update: upsert by (name, role) or append.
// ARGV[1] = socketId, ARGV[2] = name, ARGV[3] = role
const UPSERT_USER_SCRIPT = `
  local key    = KEYS[1]
  local sid    = ARGV[1]
  local name   = ARGV[2]
  local role   = ARGV[3]
  local raw    = redis.call('HGET', key, 'users')
  local users  = cjson.decode(raw or '[]')
  local found  = false
  for i, u in ipairs(users) do
    if u.name == name and u.role == role then
      u.id   = sid
      users[i] = u
      found  = true
      break
    end
  end
  if not found then
    users[#users + 1] = { id = sid, name = name, role = role, peerId = cjson.null }
  end
  local encoded = cjson.encode(users)
  redis.call('HSET', key, 'users', encoded)
  return encoded
`;

// Atomically remove a user by socketId and return updated list.
const REMOVE_USER_SCRIPT = `
  local key = KEYS[1]
  local sid = ARGV[1]
  local raw = redis.call('HGET', key, 'users')
  local users = cjson.decode(raw or '[]')
  local removed = nil
  local next = {}
  for _, u in ipairs(users) do
    if u.id == sid then
      removed = u
    else
      next[#next + 1] = u
    end
  end
  redis.call('HSET', key, 'users', cjson.encode(next))
  return cjson.encode({ removed = removed, users = next })
`;

class RoomStateManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.localCache = new Map();
  }

  async getRoomState(roomId) {
    const cached = this.localCache.get(roomId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

    const state = await this.redis.hGetAll(`room:${roomId}`);
    if (!state || Object.keys(state).length === 0) return null;

    const parsed = {
      code:        state.code || "",
      language:    state.language || "javascript",
      users:       JSON.parse(state.users    || "[]"),
      messages:    JSON.parse(state.messages || "[]"),
      events:      JSON.parse(state.events   || "[]"),
      interviewId: state.interviewId || null,
      focusMode:   state.focusMode === "true",
      timerEndsAt: state.timerEndsAt || null,
    };

    this.localCache.set(roomId, { data: parsed, timestamp: Date.now() });
    return parsed;
  }

  // Returns true if this call created the room, false if it already existed.
  async initRoom(roomId, data) {
    const created = await this.redis.eval(INIT_ROOM_SCRIPT, {
      keys: [`room:${roomId}`],
      arguments: [
        data.code        || "",
        data.language    || "javascript",
        JSON.stringify(data.users     || []),
        JSON.stringify(data.messages  || []),
        JSON.stringify(data.events    || []),
        data.interviewId || "",
        String(ROOM_TTL_S),
      ],
    });
    this._invalidate(roomId);
    return created === 1;
  }

  async updateCode(roomId, code) {
    await this.redis.hSet(`room:${roomId}`, "code", code);
    this._invalidate(roomId);
  }

  async updateLanguage(roomId, language) {
    await this.redis.hSet(`room:${roomId}`, "language", language);
    this._invalidate(roomId);
  }

  // Atomically upsert a user (match by name+role, update socketId) or append.
  // Returns the updated users array.
  async upsertUser(roomId, { id, name, role }) {
    const raw = await this.redis.eval(UPSERT_USER_SCRIPT, {
      keys: [`room:${roomId}`],
      arguments: [id, name, role],
    });
    this._invalidate(roomId);
    return JSON.parse(raw);
  }

  // Atomically remove a user by socketId.
  // Returns { removed, users } — removed is null if socketId was not found.
  async removeUser(roomId, socketId) {
    const raw = await this.redis.eval(REMOVE_USER_SCRIPT, {
      keys: [`room:${roomId}`],
      arguments: [socketId],
    });
    this._invalidate(roomId);
    return JSON.parse(raw);
  }

  // Kept for callers that need a full overwrite (e.g. peerId update).
  async updateUsers(roomId, users) {
    await this.redis.hSet(`room:${roomId}`, "users", JSON.stringify(users));
    this._invalidate(roomId);
  }

  async pushMessage(roomId, message, maxMessages = 200) {
    const raw = await this.redis.eval(PUSH_ITEM_SCRIPT, {
      keys: [`room:${roomId}`],
      arguments: ["messages", JSON.stringify(message), String(maxMessages)],
    });
    this._invalidate(roomId);
    return JSON.parse(raw);
  }

  async pushEvent(roomId, event, maxEvents = 500) {
    const raw = await this.redis.eval(PUSH_ITEM_SCRIPT, {
      keys: [`room:${roomId}`],
      arguments: ["events", JSON.stringify(event), String(maxEvents)],
    });
    this._invalidate(roomId);
    return JSON.parse(raw);
  }

  async setInterviewId(roomId, interviewId) {
    await this.redis.hSet(`room:${roomId}`, "interviewId", interviewId || "");
    this._invalidate(roomId);
  }

  async setFocusMode(roomId, enabled) {
    await this.redis.hSet(`room:${roomId}`, "focusMode", enabled ? "true" : "false");
    this._invalidate(roomId);
  }

  async setTimer(roomId, endsAt) {
    await this.redis.hSet(`room:${roomId}`, "timerEndsAt", endsAt || "");
    this._invalidate(roomId);
  }

  async getTimerEndsAt(roomId) {
    const val = await this.redis.hGet(`room:${roomId}`, "timerEndsAt");
    return val || null;
  }

  async deleteRoom(roomId) {
    await this.redis.del(`room:${roomId}`);
    this._invalidate(roomId);
  }

  _invalidate(roomId) {
    this.localCache.delete(roomId);
  }
}

module.exports = { RoomStateManager };
