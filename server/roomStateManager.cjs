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

// Atomically update a user's peerId by socketId
const UPDATE_PEER_ID_SCRIPT = `
  local key = KEYS[1]
  local sid = ARGV[1]
  local peerId = ARGV[2]
  local raw = redis.call('HGET', key, 'users')
  local users = cjson.decode(raw or '[]')
  local found = false
  for i, u in ipairs(users) do
    if u.id == sid then
      u.peerId = peerId
      users[i] = u
      found = true
      break
    end
  end
  if found then
    redis.call('HSET', key, 'users', cjson.encode(users))
  end
  return cjson.encode({ found = found, users = users })
`;

class RoomStateManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.localCache = new Map();
    this.fallbackMode = !redisClient;
    
    if (this.fallbackMode) {
      console.warn("[RoomStateManager] Running in fallback mode without Redis");
      this.memoryRooms = new Map(); // In-memory room storage
      this.roomLocks = new Map(); // Simple mutex for room operations
    }
  }

  async getRoomState(roomId) {
    if (this.fallbackMode) {
      return this.memoryRooms.get(roomId) || null;
    }
    
    if (!this.redis?.isReady) {
      console.warn("[RoomStateManager] Redis not ready, using cache only");
      const cached = this.localCache.get(roomId);
      return cached?.data || null;
    }

    const cached = this.localCache.get(roomId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

    try {
      const state = await Promise.race([
        this.redis.hGetAll(`room:${roomId}`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
      ]);
      
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
    } catch (err) {
      console.error(`[RoomStateManager] Error getting room state: ${err.message}`);
      const cached = this.localCache.get(roomId);
      return cached?.data || null;
    }
  }

  async initRoom(roomId, data) {
    if (this.fallbackMode) {
      // Simple mutex to prevent race conditions
      if (this.roomLocks.has(roomId)) {
        await new Promise(resolve => setTimeout(resolve, 10));
        return this.memoryRooms.has(roomId) ? false : true;
      }
      
      this.roomLocks.set(roomId, true);
      try {
        if (this.memoryRooms.has(roomId)) return false;
        this.memoryRooms.set(roomId, {
          code:        data.code        || "",
          language:    data.language    || "javascript",
          users:       data.users       || [],
          messages:    data.messages    || [],
          events:      data.events      || [],
          interviewId: data.interviewId || null,
          focusMode:   false,
          timerEndsAt: null,
        });
        return true;
      } finally {
        this.roomLocks.delete(roomId);
      }
    }
    
    if (!this.redis?.isReady) {
      console.warn("[RoomStateManager] Redis not ready for initRoom");
      return false;
    }

    try {
      const created = await Promise.race([
        this.redis.eval(INIT_ROOM_SCRIPT, {
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
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 5000))
      ]);
      this._invalidate(roomId);
      return created === 1;
    } catch (err) {
      console.error(`[RoomStateManager] Error initializing room: ${err.message}`);
      return false;
    }
  }

  async updateCode(roomId, code) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (room) room.code = code;
      return;
    }
    
    if (!this.redis?.isReady) return;
    
    try {
      await this.redis.hSet(`room:${roomId}`, "code", code);
      this._invalidate(roomId);
    } catch (err) {
      console.error(`[RoomStateManager] Error updating code: ${err.message}`);
    }
  }

  async updateLanguage(roomId, language) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (room) room.language = language;
      return;
    }
    
    if (!this.redis?.isReady) return;
    
    try {
      await this.redis.hSet(`room:${roomId}`, "language", language);
      this._invalidate(roomId);
    } catch (err) {
      console.error(`[RoomStateManager] Error updating language: ${err.message}`);
    }
  }

  async upsertUser(roomId, { id, name, role }) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (!room) return [];
      
      let found = false;
      for (let i = 0; i < room.users.length; i++) {
        if (room.users[i].name === name && room.users[i].role === role) {
          room.users[i].id = id;
          found = true;
          break;
        }
      }
      if (!found) {
        room.users.push({ id, name, role, peerId: null });
      }
      return room.users;
    }
    
    if (!this.redis?.isReady) return [];
    
    try {
      const raw = await Promise.race([
        this.redis.eval(UPSERT_USER_SCRIPT, {
          keys: [`room:${roomId}`],
          arguments: [id, name, role],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
      ]);
      this._invalidate(roomId);
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[RoomStateManager] Error upserting user: ${err.message}`);
      return [];
    }
  }

  // Atomically remove a user by socketId.
  // Returns { removed, users } — removed is null if socketId was not found.
  async removeUser(roomId, socketId) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (!room) return { removed: null, users: [] };
      
      let removed = null;
      const users = [];
      for (const user of room.users) {
        if (user.id === socketId) {
          removed = user;
        } else {
          users.push(user);
        }
      }
      room.users = users;
      return { removed, users };
    }
    
    if (!this.redis?.isReady) return { removed: null, users: [] };
    
    try {
      const raw = await this.redis.eval(REMOVE_USER_SCRIPT, {
        keys: [`room:${roomId}`],
        arguments: [socketId],
      });
      this._invalidate(roomId);
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[RoomStateManager] Error removing user: ${err.message}`);
      return { removed: null, users: [] };
    }
  }

  // Atomically update a user's peerId by socketId.
  // Returns { found, users } — found is false if socketId was not found.
  async updatePeerId(roomId, socketId, peerId) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (!room) return { found: false, users: [] };
      
      let found = false;
      for (const user of room.users) {
        if (user.id === socketId) {
          user.peerId = peerId;
          found = true;
          break;
        }
      }
      return { found, users: room.users };
    }
    
    if (!this.redis?.isReady) return { found: false, users: [] };
    
    try {
      const raw = await Promise.race([
        this.redis.eval(UPDATE_PEER_ID_SCRIPT, {
          keys: [`room:${roomId}`],
          arguments: [socketId, peerId || ""],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
      ]);
      this._invalidate(roomId);
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[RoomStateManager] Error updating peer ID: ${err.message}`);
      return { found: false, users: [] };
    }
  }

  async pushMessage(roomId, message, maxMessages = 200) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (!room) return [];
      
      room.messages.push(message);
      while (room.messages.length > maxMessages) {
        room.messages.shift();
      }
      return room.messages;
    }
    
    if (!this.redis?.isReady) return [];
    
    try {
      const raw = await this.redis.eval(PUSH_ITEM_SCRIPT, {
        keys: [`room:${roomId}`],
        arguments: ["messages", JSON.stringify(message), String(maxMessages)],
      });
      this._invalidate(roomId);
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[RoomStateManager] Error pushing message: ${err.message}`);
      return [];
    }
  }

  async pushEvent(roomId, event, maxEvents = 500) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (!room) return [];
      
      room.events.push(event);
      while (room.events.length > maxEvents) {
        room.events.shift();
      }
      return room.events;
    }
    
    if (!this.redis?.isReady) return [];
    
    try {
      const raw = await this.redis.eval(PUSH_ITEM_SCRIPT, {
        keys: [`room:${roomId}`],
        arguments: ["events", JSON.stringify(event), String(maxEvents)],
      });
      this._invalidate(roomId);
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[RoomStateManager] Error pushing event: ${err.message}`);
      return [];
    }
  }

  async setInterviewId(roomId, interviewId) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (room) room.interviewId = interviewId || null;
      return;
    }
    
    if (!this.redis?.isReady) return;
    
    try {
      await this.redis.hSet(`room:${roomId}`, "interviewId", interviewId || "");
      this._invalidate(roomId);
    } catch (err) {
      console.error(`[RoomStateManager] Error setting interview ID: ${err.message}`);
    }
  }

  async setFocusMode(roomId, enabled) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (room) room.focusMode = enabled;
      return;
    }
    
    if (!this.redis?.isReady) return;
    
    try {
      await this.redis.hSet(`room:${roomId}`, "focusMode", enabled ? "true" : "false");
      this._invalidate(roomId);
    } catch (err) {
      console.error(`[RoomStateManager] Error setting focus mode: ${err.message}`);
    }
  }

  async setTimer(roomId, endsAt) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      if (room) room.timerEndsAt = endsAt || null;
      return;
    }
    
    if (!this.redis?.isReady) return;
    
    try {
      await this.redis.hSet(`room:${roomId}`, "timerEndsAt", endsAt || "");
      this._invalidate(roomId);
    } catch (err) {
      console.error(`[RoomStateManager] Error setting timer: ${err.message}`);
    }
  }

  async getTimerEndsAt(roomId) {
    if (this.fallbackMode) {
      const room = this.memoryRooms.get(roomId);
      return room?.timerEndsAt || null;
    }
    
    if (!this.redis?.isReady) return null;
    
    try {
      const val = await this.redis.hGet(`room:${roomId}`, "timerEndsAt");
      return val || null;
    } catch (err) {
      console.error(`[RoomStateManager] Error getting timer: ${err.message}`);
      return null;
    }
  }

  async deleteRoom(roomId) {
    if (this.fallbackMode) {
      this.memoryRooms.delete(roomId);
      this._invalidate(roomId);
      return;
    }
    
    if (!this.redis?.isReady) {
      this._invalidate(roomId);
      return;
    }
    
    try {
      await this.redis.del(`room:${roomId}`);
      this._invalidate(roomId);
    } catch (err) {
      console.error(`[RoomStateManager] Error deleting room: ${err.message}`);
    }
  }

  _invalidate(roomId) {
    this.localCache.delete(roomId);
  }
}

module.exports = { RoomStateManager };
