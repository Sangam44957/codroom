"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { logHealthCheck } from "@/lib/healthCheck";

const MAX_MESSAGES = 200;
const MAX_TIMELINE_EVENTS = 500; // Cap timeline events to prevent memory growth

export default function useSocket(roomId, userName, role, token, roomTicket) {
  const socketRef = useRef(null);
  const hasConnectedOnceRef = useRef(false);
  const reconnectDetectedRef = useRef(false);
  const userNameRef = useRef(userName);
  const roleRef = useRef(role);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [serverStateLost, setServerStateLost] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);

  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { roleRef.current = role; }, [role]);

  // Stable handler refs — updated every render, never cause re-subscriptions
  const handlersRef = useRef({
    onCodeUpdate: null,
    onLanguageUpdate: null,
    onOutputUpdate: null,
    onPeerIdReceived: null,
    onInterviewStarted: null,
    onFocusModeChanged: null,
    onWhiteboardDraw: null,
    onWhiteboardClear: null,
    onRemoteCameraToggle: null,
    onRemoteMicToggle: null,
    onCandidateUnlocked: null,
    onRemoteCursor: null,
    onTimerSync: null,
  });

  useEffect(() => {
    if (!roomId || !userNameRef.current) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
      forceNew: true,
      auth: { roomTicket, token },
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (hasConnectedOnceRef.current) {
        reconnectDetectedRef.current = true;
        toast.success("Reconnected", { id: "socket-reconnect", duration: 3000 });
      }
      hasConnectedOnceRef.current = true;
      setIsConnected(true);
      // Use refs so socket doesn't tear down when userName/role change
      socket.emit("join-room", {
        roomId,
        userName: userNameRef.current,
        role: roleRef.current,
      });
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      setIsJoined(false);
      console.warn(`[socket] Disconnected: ${reason}`);
      
      // Different handling based on disconnect reason
      if (reason === "io server disconnect") {
        toast.error("Disconnected by server", { id: "socket-disconnect", duration: 5000 });
      } else if (reason === "transport close" || reason === "transport error") {
        toast.warning("Lost connection to server", { id: "socket-disconnect", duration: Infinity });
      } else {
        toast.warning("Connection lost — reconnecting…", { id: "socket-disconnect", duration: Infinity });
      }
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] connect_error details:", {
        message: err.message,
        description: err.description,
        context: err.context,
        type: err.type,
        socketUrl,
        timestamp: new Date().toISOString()
      });
      
      // Run health check on connection errors
      logHealthCheck();
      
      // Only show the toast on the first error — socket.io will keep retrying silently
      if (!hasConnectedOnceRef.current) {
        toast.error(`Connection failed: ${err.message}`, { id: "socket-connect-error", duration: 10000 });
      }
    });

    socket.on("join-error", (data) => {
      const message = data?.message || "Unknown join error";
      toast.error(`Room error: ${message}`, { id: "socket-join-error" });
      setIsJoined(false);
    });

    socket.on("room-state", (data) => {
      if (!data || typeof data !== 'object') {
        console.warn('[socket] Invalid room-state payload:', data);
        return;
      }
      
      const {
        code,
        language,
        users,
        messages,
        interviewId,
        events,
        focusMode,
        timerEndsAt,
        isEmptyRoom
      } = data;
      
      setUsers(users || []);
      setMessages(messages?.slice(-MAX_MESSAGES) || []);
      setTimelineEvents((events || []).slice(-MAX_TIMELINE_EVENTS));
      setIsJoined(true); // Successfully joined room

      toast.dismiss("socket-disconnect");
      toast.dismiss("socket-connect-error");

      // Handle reconnect state sync BEFORE resetting the flag
      if (reconnectDetectedRef.current) {
        if (isEmptyRoom) {
          setServerStateLost(true);
        } else {
          // Rehydrate state from server snapshot on reconnect
          if (code !== undefined) handlersRef.current.onCodeUpdate?.(code);
          if (language !== undefined) handlersRef.current.onLanguageUpdate?.(language);
          handlersRef.current.onTimerSync?.({ endsAt: timerEndsAt || null });
          if (typeof focusMode === "boolean") handlersRef.current.onFocusModeChanged?.(focusMode);
          setServerStateLost(false);
        }
        // Reset reconnect flag AFTER sync logic completes
        reconnectDetectedRef.current = false;
      } else {
        setServerStateLost(false);
      }

      // Handle initial connection or non-reconnect updates
      if (typeof focusMode === "boolean" && !reconnectDetectedRef.current) handlersRef.current.onFocusModeChanged?.(focusMode);
      if (interviewId && handlersRef.current.onInterviewStarted) handlersRef.current.onInterviewStarted(interviewId);
      if (!reconnectDetectedRef.current) handlersRef.current.onTimerSync?.({ endsAt: timerEndsAt || null });
    });

    socket.on("focus-mode-changed", (data) => {
      const enabled = data?.enabled;
      if (typeof enabled === 'boolean') {
        handlersRef.current.onFocusModeChanged?.(enabled);
      }
    });

    socket.on("user-joined", (data) => setUsers(data?.users || []));
    socket.on("user-left", (data) => setUsers(data?.users || []));

    socket.on("chat-message", (message) => {
      setMessages((prev) => {
        const next = [...prev, message];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    });

    socket.on("code-update", (data) => {
      if (data?.code !== undefined) {
        handlersRef.current.onCodeUpdate?.(data.code);
      }
    });
    socket.on("language-update", (data) => {
      if (data?.language) {
        handlersRef.current.onLanguageUpdate?.(data.language);
      }
    });
    socket.on("output-update", (data) => {
      if (data?.output) {
        handlersRef.current.onOutputUpdate?.(data.output);
      }
    });
    socket.on("timeline-event", (event) => {
      setTimelineEvents((prev) => {
        const next = [...prev, event];
        return next.length > MAX_TIMELINE_EVENTS ? next.slice(-MAX_TIMELINE_EVENTS) : next;
      });
    });
    socket.on("peer-id-received", (data) => {
      if (data?.peerId && data.socketId !== socket.id) {
        handlersRef.current.onPeerIdReceived?.(data.peerId);
      }
    });
    socket.on("interview-started", (data) => {
      if (data?.interviewId) {
        handlersRef.current.onInterviewStarted?.(data.interviewId);
      }
    });
    socket.on("whiteboard-draw", (data) => {
      if (data?.stroke) {
        handlersRef.current.onWhiteboardDraw?.(data.stroke);
      }
    });
    socket.on("whiteboard-clear", () => handlersRef.current.onWhiteboardClear?.());
    socket.on("remote-camera-toggle", (data) => {
      if (typeof data?.isOff === 'boolean') {
        handlersRef.current.onRemoteCameraToggle?.(data.isOff);
      }
    });
    socket.on("remote-mic-toggle", (data) => {
      if (typeof data?.isMuted === 'boolean') {
        handlersRef.current.onRemoteMicToggle?.(data.isMuted);
      }
    });
    socket.on("candidate-unlocked", () => handlersRef.current.onCandidateUnlocked?.());
    socket.on("remote-cursor", (data) => handlersRef.current.onRemoteCursor?.(data));
    socket.on("timer-sync", (data) => handlersRef.current.onTimerSync?.(data));

    socket.on("force-disconnect", (data) => {
      const reason = data?.reason || "unknown";
      if (reason === "duplicate-connection") {
        toast.warning("Another session detected. Reconnecting...", { id: "duplicate-session", duration: 3000 });
      }
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsJoined(false);
      setUsers([]);
      setMessages([]);
      setServerStateLost(false);
      setTimelineEvents([]);
      hasConnectedOnceRef.current = false;
      reconnectDetectedRef.current = false;
    };
  }, [roomId, roomTicket, token]); // roomId, roomTicket, and token trigger reconnect

  // ─── Emit helpers ────────────────────────────────────────────

  const emitCodeChange = useCallback(
    (code) => socketRef.current?.emit("code-change", { roomId, code }),
    [roomId]
  );

  const emitLanguageChange = useCallback(
    (language) => socketRef.current?.emit("language-change", { roomId, language }),
    [roomId]
  );

  const emitCodeOutput = useCallback(
    (output) => socketRef.current?.emit("code-output", { roomId, output }),
    [roomId]
  );

  const emitTimelineEvent = useCallback(
    (event) => socketRef.current?.emit("timeline-event", { roomId, event }),
    [roomId]
  );

  const emitWhiteboardDraw = useCallback(
    (stroke) => socketRef.current?.emit("whiteboard-draw", { roomId, stroke }),
    [roomId]
  );

  const emitWhiteboardClear = useCallback(
    () => socketRef.current?.emit("whiteboard-clear", { roomId }),
    [roomId]
  );

  const sendMessage = useCallback(
    (text) => socketRef.current?.emit("send-message", { roomId, text }),
    [roomId]
  );

  const sharePeerId = useCallback(
    (peerId) => socketRef.current?.emit("share-peer-id", { roomId, peerId }),
    [roomId]
  );

  const emitSetInterviewId = useCallback(
    (interviewId) => socketRef.current?.emit("set-interview-id", { roomId, interviewId }),
    [roomId]
  );

  const emitCameraToggle = useCallback(
    (isOff) => socketRef.current?.emit("camera-toggle", { roomId, isOff }),
    [roomId]
  );

  const emitMicToggle = useCallback(
    (isMuted) => socketRef.current?.emit("mic-toggle", { roomId, isMuted }),
    [roomId]
  );

  const emitSetFocusMode = useCallback(
    (enabled) => socketRef.current?.emit("set-focus-mode", { roomId, enabled }),
    [roomId]
  );

  const emitUnlockCandidate = useCallback(
    () => socketRef.current?.emit("unlock-candidate", { roomId }),
    [roomId]
  );

  const emitTimerSet = useCallback(
    (durationMinutes) => socketRef.current?.emit("timer-set", { roomId, durationMinutes }),
    [roomId]
  );

  const emitTimerExtend = useCallback(
    (addMinutes) => socketRef.current?.emit("timer-extend", { roomId, addMinutes }),
    [roomId]
  );

  const emitTimerClear = useCallback(
    () => socketRef.current?.emit("timer-clear", { roomId }),
    [roomId]
  );

  const onTimerSync = useCallback((handler) => {
    handlersRef.current.onTimerSync = handler;
  }, []);

  const emitCursorMove = useCallback(
    (cursor) => socketRef.current?.emit("cursor-move", { roomId, cursor }),
    [roomId]
  );

  // ─── Handler registration — just update the ref, no re-subscription needed ──

  const onCodeUpdate = useCallback((handler) => {
    handlersRef.current.onCodeUpdate = handler;
  }, []);

  const onLanguageUpdate = useCallback((handler) => {
    handlersRef.current.onLanguageUpdate = handler;
  }, []);

  const onOutputUpdate = useCallback((handler) => {
    handlersRef.current.onOutputUpdate = handler;
  }, []);

  const onPeerIdReceived = useCallback((handler) => {
    handlersRef.current.onPeerIdReceived = handler;
  }, []);

  const onInterviewStarted = useCallback((handler) => {
    handlersRef.current.onInterviewStarted = handler;
  }, []);

  const onFocusModeChanged = useCallback((handler) => {
    handlersRef.current.onFocusModeChanged = handler;
  }, []);

  const onWhiteboardDraw = useCallback((handler) => {
    handlersRef.current.onWhiteboardDraw = handler;
  }, []);

  const onRemoteCameraToggle = useCallback((handler) => {
    handlersRef.current.onRemoteCameraToggle = handler;
  }, []);

  const onRemoteMicToggle = useCallback((handler) => {
    handlersRef.current.onRemoteMicToggle = handler;
  }, []);

  const onCandidateUnlocked = useCallback((handler) => {
    handlersRef.current.onCandidateUnlocked = handler;
  }, []);

  const onWhiteboardClear = useCallback((handler) => {
    handlersRef.current.onWhiteboardClear = handler;
  }, []);

  const onRemoteCursor = useCallback((handler) => {
    handlersRef.current.onRemoteCursor = handler;
  }, []);

  return {
    isConnected: isConnected && isJoined,
    serverStateLost,
    users,
    messages,
    timelineEvents,
    emitCodeChange,
    emitLanguageChange,
    emitCodeOutput,
    emitTimelineEvent,
    sendMessage,
    sharePeerId,
    emitSetInterviewId,
    emitCameraToggle,
    emitMicToggle,
    emitSetFocusMode,
    emitWhiteboardDraw,
    emitWhiteboardClear,
    emitUnlockCandidate,
    onRemoteCameraToggle,
    onRemoteMicToggle,
    onWhiteboardDraw,
    onWhiteboardClear,
    onRemoteCursor,
    emitTimerSet,
    emitTimerExtend,
    emitTimerClear,
    onTimerSync,
    emitCursorMove,
    onCodeUpdate,
    onLanguageUpdate,
    onOutputUpdate,
    onPeerIdReceived,
    onInterviewStarted,
    onFocusModeChanged,
    onCandidateUnlocked,
  };
}
