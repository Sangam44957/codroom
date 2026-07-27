export class RoomStateManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async getRoomState(roomId) {
    if (!this.redis?.isReady) return null;
    try {
      const data = await this.redis.hGetAll(`room:${roomId}`);
      if (!Object.keys(data).length) return null;
      return {
        code: data.code || "",
        language: data.language || "javascript",
        users: data.users ? JSON.parse(data.users) : [],
        messages: data.messages ? JSON.parse(data.messages) : [],
        events: data.events ? JSON.parse(data.events) : [],
        interviewId: data.interviewId || null,
        focusMode: data.focusMode === "true",
        timerEndsAt: data.timerEndsAt || null,
      };
    } catch {
      return null;
    }
  }

  async initRoom(roomId, state) {
    if (!this.redis?.isReady) return false;
    try {
      const script = `
        if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
        redis.call('HSET', KEYS[1],
          'code',        ARGV[1],
          'language',    ARGV[2],
          'users',       ARGV[3],
          'messages',    ARGV[4],
          'events',      ARGV[5],
          'interviewId', ARGV[6],
          'focusMode',   'false',
          'timerEndsAt', ''
        )
        redis.call('EXPIRE', KEYS[1], 86400)
        return 1
      `;
      const wrote = await this.redis.eval(script, {
        keys: [`room:${roomId}`],
        arguments: [
          state.code || "",
          state.language || "javascript",
          JSON.stringify(state.users || []),
          JSON.stringify(state.messages || []),
          JSON.stringify(state.events || []),
          state.interviewId || "",
        ],
      });
      return wrote === 1;
    } catch (err) {
      console.error("Redis initRoom error:", err.message);
      return false;
    }
  }

  async updateCode(roomId, code) {
    if (!this.redis?.isReady) return;
    try {
      await this.redis.hSet(`room:${roomId}`, "code", code || "");
    } catch (err) {
      console.error("Redis updateCode error:", err.message);
    }
  }

  async updateLanguage(roomId, language) {
    if (!this.redis?.isReady) return;
    try {
      await this.redis.hSet(`room:${roomId}`, "language", language || "javascript");
    } catch (err) {
      console.error("Redis updateLanguage error:", err.message);
    }
  }

  async upsertUser(roomId, user) {
    if (!this.redis?.isReady) return [user];
    try {
      const script = `
        local key = KEYS[1]
        local userJson = ARGV[1]
        local userId = ARGV[2]
        local usersJson = redis.call('HGET', key, 'users')
        local users = {}
        if usersJson then
          users = cjson.decode(usersJson)
        end
        local found = false
        for i, u in ipairs(users) do
          if u.id == userId then
            users[i] = cjson.decode(userJson)
            found = true
            break
          end
        end
        if not found then
          table.insert(users, cjson.decode(userJson))
        end
        local result = cjson.encode(users)
        redis.call('HSET', key, 'users', result)
        return result
      `;
      const result = await this.redis.eval(script, {
        keys: [`room:${roomId}`],
        arguments: [JSON.stringify(user), user.id]
      });
      return JSON.parse(result);
    } catch (err) {
      console.error("Redis upsertUser error:", err.message);
      return [user];
    }
  }

  async removeUser(roomId, socketId) {
    if (!this.redis?.isReady) return { removed: null, users: [] };
    try {
      const script = `
        local key = KEYS[1]
        local socketId = ARGV[1]
        local usersJson = redis.call('HGET', key, 'users')
        local users = {}
        local removed = nil
        if usersJson then
          users = cjson.decode(usersJson)
          for i, u in ipairs(users) do
            if u.id == socketId then
              removed = u
              table.remove(users, i)
              break
            end
          end
        end
        local result = cjson.encode(users)
        redis.call('HSET', key, 'users', result)
        return {cjson.encode(removed), result}
      `;
      const [removedJson, usersJson] = await this.redis.eval(script, {
        keys: [`room:${roomId}`],
        arguments: [socketId]
      });
      return {
        removed: removedJson !== "null" ? JSON.parse(removedJson) : null,
        users: JSON.parse(usersJson)
      };
    } catch (err) {
      console.error("Redis removeUser error:", err.message);
      return { removed: null, users: [] };
    }
  }

  async getRoomUsers(roomId) {
    if (!this.redis?.isReady) return [];
    try {
      const usersJson = await this.redis.hGet(`room:${roomId}`, "users");
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (err) {
      console.error("Redis getRoomUsers error:", err.message);
      return [];
    }
  }

  async updatePeerId(roomId, socketId, peerId) {
    if (!this.redis?.isReady) return { found: false };
    try {
      const script = `
        local key = KEYS[1]
        local socketId = ARGV[1]
        local peerId = ARGV[2]
        local usersJson = redis.call('HGET', key, 'users')
        local found = false
        if usersJson then
          local users = cjson.decode(usersJson)
          for i, u in ipairs(users) do
            if u.id == socketId then
              u.peerId = peerId
              found = true
              break
            end
          end
          if found then
            redis.call('HSET', key, 'users', cjson.encode(users))
          end
        end
        return found and 1 or 0
      `;
      const result = await this.redis.eval(script, {
        keys: [`room:${roomId}`],
        arguments: [socketId, peerId]
      });
      return { found: result === 1 };
    } catch (err) {
      console.error("Redis updatePeerId error:", err.message);
      return { found: false };
    }
  }

  async pushMessage(roomId, message) {
    if (!this.redis?.isReady) return;
    try {
      const script = `
        local key = KEYS[1]
        local messageJson = ARGV[1]
        local messagesJson = redis.call('HGET', key, 'messages')
        local messages = {}
        if messagesJson then
          messages = cjson.decode(messagesJson)
        end
        table.insert(messages, cjson.decode(messageJson))
        while #messages > 200 do
          table.remove(messages, 1)
        end
        redis.call('HSET', key, 'messages', cjson.encode(messages))
        return 'OK'
      `;
      await this.redis.eval(script, {
        keys: [`room:${roomId}`],
        arguments: [JSON.stringify(message)]
      });
    } catch (err) {
      console.error("Redis pushMessage error:", err.message);
    }
  }

  async pushEvent(roomId, event) {
    if (!this.redis?.isReady) return;
    try {
      const script = `
        local key = KEYS[1]
        local eventJson = ARGV[1]
        local eventsJson = redis.call('HGET', key, 'events')
        local events = {}
        if eventsJson then
          events = cjson.decode(eventsJson)
        end
        table.insert(events, cjson.decode(eventJson))
        while #events > 100 do
          table.remove(events, 1)
        end
        redis.call('HSET', key, 'events', cjson.encode(events))
        return 'OK'
      `;
      await this.redis.eval(script, {
        keys: [`room:${roomId}`],
        arguments: [JSON.stringify(event)]
      });
    } catch (err) {
      console.error("Redis pushEvent error:", err.message);
    }
  }

  async setInterviewId(roomId, interviewId) {
    if (!this.redis?.isReady) return;
    try {
      await this.redis.hSet(`room:${roomId}`, "interviewId", interviewId || "");
    } catch (err) {
      console.error("Redis setInterviewId error:", err.message);
    }
  }

  async setFocusMode(roomId, enabled) {
    if (!this.redis?.isReady) return;
    try {
      await this.redis.hSet(`room:${roomId}`, "focusMode", enabled ? "true" : "false");
    } catch (err) {
      console.error("Redis setFocusMode error:", err.message);
    }
  }

  async setTimer(roomId, endsAt) {
    if (!this.redis?.isReady) return;
    try {
      await this.redis.hSet(`room:${roomId}`, "timerEndsAt", endsAt || "");
    } catch (err) {
      console.error("Redis setTimer error:", err.message);
    }
  }

  async getTimerEndsAt(roomId) {
    if (!this.redis?.isReady) return null;
    try {
      return await this.redis.hGet(`room:${roomId}`, "timerEndsAt") || null;
    } catch (err) {
      console.error("Redis getTimerEndsAt error:", err.message);
      return null;
    }
  }

  async deleteRoom(roomId) {
    if (!this.redis?.isReady) return;
    try {
      await this.redis.del(`room:${roomId}`);
    } catch (err) {
      console.error("Redis deleteRoom error:", err.message);
    }
  }
}