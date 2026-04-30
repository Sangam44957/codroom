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
    if (!this.redis?.isReady) return;
    try {
      await this.redis.hMSet(`room:${roomId}`, {
        code: state.code || "",
        language: state.language || "javascript",
        users: JSON.stringify(state.users || []),
        messages: JSON.stringify(state.messages || []),
        events: JSON.stringify(state.events || []),
        interviewId: state.interviewId || "",
        focusMode: "false",
        timerEndsAt: "",
      });
      await this.redis.expire(`room:${roomId}`, 86400);
    } catch (err) {
      console.error("Redis initRoom error:", err.message);
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
      const usersJson = await this.redis.hGet(`room:${roomId}`, "users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      const existing = users.findIndex(u => u.id === user.id);
      if (existing >= 0) {
        users[existing] = user;
      } else {
        users.push(user);
      }
      await this.redis.hSet(`room:${roomId}`, "users", JSON.stringify(users));
      return users;
    } catch (err) {
      console.error("Redis upsertUser error:", err.message);
      return [user];
    }
  }

  async removeUser(roomId, socketId) {
    if (!this.redis?.isReady) return { removed: null, users: [] };
    try {
      const usersJson = await this.redis.hGet(`room:${roomId}`, "users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      const index = users.findIndex(u => u.id === socketId);
      if (index === -1) return { removed: null, users };
      const removed = users.splice(index, 1)[0];
      await this.redis.hSet(`room:${roomId}`, "users", JSON.stringify(users));
      return { removed, users };
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
      const usersJson = await this.redis.hGet(`room:${roomId}`, "users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      const user = users.find(u => u.id === socketId);
      if (!user) return { found: false };
      user.peerId = peerId;
      await this.redis.hSet(`room:${roomId}`, "users", JSON.stringify(users));
      return { found: true };
    } catch (err) {
      console.error("Redis updatePeerId error:", err.message);
      return { found: false };
    }
  }

  async pushMessage(roomId, message) {
    if (!this.redis?.isReady) return;
    try {
      const messagesJson = await this.redis.hGet(`room:${roomId}`, "messages");
      const messages = messagesJson ? JSON.parse(messagesJson) : [];
      messages.push(message);
      if (messages.length > 200) messages.shift();
      await this.redis.hSet(`room:${roomId}`, "messages", JSON.stringify(messages));
    } catch (err) {
      console.error("Redis pushMessage error:", err.message);
    }
  }

  async pushEvent(roomId, event) {
    if (!this.redis?.isReady) return;
    try {
      const eventsJson = await this.redis.hGet(`room:${roomId}`, "events");
      const events = eventsJson ? JSON.parse(eventsJson) : [];
      events.push(event);
      if (events.length > 100) events.shift();
      await this.redis.hSet(`room:${roomId}`, "events", JSON.stringify(events));
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