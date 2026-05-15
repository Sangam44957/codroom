/**
 * server/roomStateManager.mjs
 *
 * Redis-backed room state manager.
 *
 * Responsibilities:
 * - In-memory collaborative room state
 * - Redis persistence abstraction
 * - Safe Redis access wrappers
 * - Room lifecycle state handling
 * - User/session synchronization
 *
 * NOT responsible for:
 * - Socket transport
 * - HTTP handling
 * - Business rules
 * - Database persistence
 *
 * LLD Principles:
 * - Encapsulation
 * - Dependency Injection
 * - Cohesion
 * - Structured Logging
 * - Fail-safe Redis operations
 */

import {
  REDIS,
  DEFAULT_LANGUAGE,
  CODE_LIMITS,
} from "../src/lib/constants.js";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const MAX_ROOM_MESSAGES =
  CODE_LIMITS.MAX_MESSAGES_FETCH;

const MAX_ROOM_EVENTS =
  100;

/* -------------------------------------------------------------------------- */
/*                           ROOM STATE MANAGER                               */
/* -------------------------------------------------------------------------- */

export class RoomStateManager {
  /**
   * @param {import("redis").RedisClientType} redisClient
   * @param {import("pino").Logger} logger
   */
  constructor(
    redisClient,
    logger
  ) {
    this._redis =
      redisClient;

    this._logger =
      logger;
  }

  /* ------------------------------------------------------------------------ */
  /*                               PRIVATE HELPERS                            */
  /* ------------------------------------------------------------------------ */

  get _ready() {
    return Boolean(
      this._redis?.isReady
    );
  }

  _key(roomId) {
    return `room:${roomId}`;
  }

  _normalizeString(
    value,
    fallback = ""
  ) {
    if (
      typeof value !==
      "string"
    ) {
      return fallback;
    }

    return value;
  }

  _safeParseJson(
    value,
    fallback
  ) {
    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      this._logger.warn(
        {
          err: error,
        },
        "JSON parse failed"
      );

      return fallback;
    }
  }

  async _safeGet(
    roomId,
    field
  ) {
    if (!this._ready) {
      return null;
    }

    try {
      return await this._redis.hGet(
        this._key(roomId),
        field
      );
    } catch (error) {
      this._logger.warn(
        {
          err: error,
          roomId,
          field,
        },
        "Redis hGet failed"
      );

      return null;
    }
  }

  async _safeSet(
    roomId,
    field,
    value
  ) {
    if (!this._ready) {
      return;
    }

    try {
      await this._redis.hSet(
        this._key(roomId),
        field,
        value
      );
    } catch (error) {
      this._logger.warn(
        {
          err: error,
          roomId,
          field,
        },
        "Redis hSet failed"
      );
    }
  }

  async _safeGetJson(
    roomId,
    field,
    fallback = []
  ) {
    const raw =
      await this._safeGet(
        roomId,
        field
      );

    return this._safeParseJson(
      raw,
      fallback
    );
  }

  async _safeSetJson(
    roomId,
    field,
    value
  ) {
    await this._safeSet(
      roomId,
      field,
      JSON.stringify(value)
    );
  }

  async _safeExpire(
    roomId
  ) {
    if (!this._ready) {
      return;
    }

    try {
      await this._redis.expire(
        this._key(roomId),
        REDIS.ROOM_TTL_SECONDS
      );
    } catch (error) {
      this._logger.warn(
        {
          err: error,
          roomId,
        },
        "Redis expire failed"
      );
    }
  }

  _buildInitialState(
    state = {}
  ) {
    return {
      code:
        this._normalizeString(
          state.code
        ),

      language:
        state.language ||
        DEFAULT_LANGUAGE,

      users:
        JSON.stringify(
          state.users || []
        ),

      messages:
        JSON.stringify(
          state.messages || []
        ),

      events:
        JSON.stringify(
          state.events || []
        ),

      interviewId:
        state.interviewId ||
        "",

      focusMode:
        "false",

      timerEndsAt:
        "",
    };
  }

  _boundedPush(
    collection,
    item,
    limit
  ) {
    collection.push(item);

    if (
      collection.length >
      limit
    ) {
      collection.shift();
    }

    return collection;
  }

  /* ------------------------------------------------------------------------ */
  /*                               PUBLIC API                                 */
  /* ------------------------------------------------------------------------ */

  /**
   * Fetches full room state.
   *
   * @param {string} roomId
   *
   * @returns {Promise<Object|null>}
   */
  async getRoomState(
    roomId
  ) {
    if (!this._ready) {
      return null;
    }

    try {
      const data =
        await this._redis.hGetAll(
          this._key(roomId)
        );

      if (
        !Object.keys(data)
          .length
      ) {
        return null;
      }

      return {
        code:
          data.code || "",

        language:
          data.language ||
          DEFAULT_LANGUAGE,

        users:
          this._safeParseJson(
            data.users,
            []
          ),

        messages:
          this._safeParseJson(
            data.messages,
            []
          ),

        events:
          this._safeParseJson(
            data.events,
            []
          ),

        interviewId:
          data.interviewId ||
          null,

        focusMode:
          data.focusMode ===
          "true",

        timerEndsAt:
          data.timerEndsAt ||
          null,
      };
    } catch (error) {
      this._logger.warn(
        {
          err: error,
          roomId,
        },
        "getRoomState failed"
      );

      return null;
    }
  }

  /**
   * Initializes room state.
   *
   * @param {string} roomId
   * @param {Object} state
   */
  async initRoom(
    roomId,
    state = {}
  ) {
    if (!this._ready) {
      return;
    }

    try {
      await this._redis.hSet(
        this._key(roomId),
        this._buildInitialState(
          state
        )
      );

      await this._safeExpire(
        roomId
      );
    } catch (error) {
      this._logger.error(
        {
          err: error,
          roomId,
        },
        "initRoom failed"
      );
    }
  }

  /**
   * Updates collaborative code state.
   */
  async updateCode(
    roomId,
    code
  ) {
    await this._safeSet(
      roomId,
      "code",
      this._normalizeString(
        code
      )
    );
  }

  /**
   * Updates active language.
   */
  async updateLanguage(
    roomId,
    language
  ) {
    await this._safeSet(
      roomId,
      "language",
      language ||
        DEFAULT_LANGUAGE
    );
  }

  /**
   * Adds or updates user.
   */
  async upsertUser(
    roomId,
    user
  ) {
    const users =
      await this._safeGetJson(
        roomId,
        "users"
      );

    const index =
      users.findIndex(
        (existingUser) =>
          existingUser.id ===
          user.id
      );

    if (index >= 0) {
      users[index] =
        user;
    } else {
      users.push(user);
    }

    await this._safeSetJson(
      roomId,
      "users",
      users
    );

    return users;
  }

  /**
   * Removes socket user.
   */
  async removeUser(
    roomId,
    socketId
  ) {
    const users =
      await this._safeGetJson(
        roomId,
        "users"
      );

    const index =
      users.findIndex(
        (user) =>
          user.id ===
          socketId
      );

    if (index === -1) {
      return {
        removed: null,
        users,
      };
    }

    const [removed] =
      users.splice(
        index,
        1
      );

    await this._safeSetJson(
      roomId,
      "users",
      users
    );

    return {
      removed,
      users,
    };
  }

  /**
   * Fetches room users.
   */
  async getRoomUsers(
    roomId
  ) {
    return this._safeGetJson(
      roomId,
      "users"
    );
  }

  /**
   * Updates peer connection id.
   */
  async updatePeerId(
    roomId,
    socketId,
    peerId
  ) {
    const users =
      await this._safeGetJson(
        roomId,
        "users"
      );

    const user =
      users.find(
        (candidate) =>
          candidate.id ===
          socketId
      );

    if (!user) {
      return {
        found: false,
      };
    }

    user.peerId =
      peerId;

    await this._safeSetJson(
      roomId,
      "users",
      users
    );

    return {
      found: true,
    };
  }

  /**
   * Pushes room message.
   */
  async pushMessage(
    roomId,
    message
  ) {
    const messages =
      await this._safeGetJson(
        roomId,
        "messages"
      );

    this._boundedPush(
      messages,
      message,
      MAX_ROOM_MESSAGES
    );

    await this._safeSetJson(
      roomId,
      "messages",
      messages
    );
  }

  /**
   * Pushes room event.
   */
  async pushEvent(
    roomId,
    event
  ) {
    const events =
      await this._safeGetJson(
        roomId,
        "events"
      );

    this._boundedPush(
      events,
      event,
      MAX_ROOM_EVENTS
    );

    await this._safeSetJson(
      roomId,
      "events",
      events
    );
  }

  /**
   * Sets interview id.
   */
  async setInterviewId(
    roomId,
    interviewId
  ) {
    await this._safeSet(
      roomId,
      "interviewId",
      interviewId || ""
    );
  }

  /**
   * Toggles focus mode.
   */
  async setFocusMode(
    roomId,
    enabled
  ) {
    await this._safeSet(
      roomId,
      "focusMode",
      enabled
        ? "true"
        : "false"
    );
  }

  /**
   * Sets room timer.
   */
  async setTimer(
    roomId,
    endsAt
  ) {
    await this._safeSet(
      roomId,
      "timerEndsAt",
      endsAt || ""
    );
  }

  /**
   * Fetches timer end.
   */
  async getTimerEndsAt(
    roomId
  ) {
    return this._safeGet(
      roomId,
      "timerEndsAt"
    );
  }

  /**
   * Deletes room state.
   */
  async deleteRoom(
    roomId
  ) {
    if (!this._ready) {
      return;
    }

    try {
      await this._redis.del(
        this._key(roomId)
      );
    } catch (error) {
      this._logger.warn(
        {
          err: error,
          roomId,
        },
        "deleteRoom failed"
      );
    }
  }
}