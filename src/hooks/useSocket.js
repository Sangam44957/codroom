"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

const MAX_MESSAGES = 200;

export default function useSocket(roomId, userName, role) {
  const socketRef = useRef(null);
  const hasConnectedOnceRef = useRef(false);
  const reconnectDetectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [serverStateLost, setServerStateLost] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);

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
    if (!roomId || !userName) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const ticketCookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`room-ticket-${roomId}=`));
    const roomTicket = ticketCookie
      ? decodeURIComponent(ticketCookie.slice(`room-ticket-${roomId}=`.length))
      : undefined;

    const socket = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,   // jitter prevents thundering herd on server restart
      timeout: 10000,
      auth: { roomTicket },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (hasConnectedOnceRef.current) {
        reconnectDetectedRef.current = true;
        toast.success("Reconnected", { id: "socket-reconnect", duration: 3000 });
      }
      hasConnectedOnceRef.current = true;
      setIsConnected(true);
      socket.emit("join-room", { roomId, userName, role });
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      // "io server disconnect" means the server explicitly kicked us — don't auto-reconnect
      if (reason === "io server disconnect") {
        toast.error("Disconnected by server", { id: "socket-disconnect" });
        // Do not reconnect - server intentionally disconnected us
      } else {
        toast.warning("Connection lost — reconnecting…", { id: "socket-disconnect", duration: Infinity });
      }
    });

    socket.on("connect_error", (err) => {
      // Only show the toast on the first error — socket.io will keep retrying silently
      if (!hasConnectedOnceRef.current) {
        toast.error("Cannot reach server — retrying…", { id: "socket-connect-error", duration: Infinity });
      }
      console.warn("[socket] connect_error:", err.message);
    });

    socket.on("join-error", ({ message }) => {
      toast.error(`Room error: ${message}`, { id: "socket-join-error" });
    });

    socket.on("room-state", ({ code, language, users, messages, interviewId, events, focusMode, timerEndsAt, isEmptyRoom }) => {
      setUsers(users || []);
      setMessages(messages?.slice(-MAX_MESSAGES) || []);
      setTimelineEvents(events || []);

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

    socket.on("focus-mode-changed", ({ enabled }) => {
      handlersRef.current.onFocusModeChanged?.(enabled);
    });

    socket.on("user-joined", ({ users }) => setUsers(users || []));
    socket.on("user-left", ({ users }) => setUsers(users || []));

    socket.on("chat-message", (message) => {
      setMessages((prev) => {
        const next = [...prev, message];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    });

    socket.on("code-update", ({ code }) => handlersRef.current.onCodeUpdate?.(code));
    socket.on("language-update", ({ language }) => handlersRef.current.onLanguageUpdate?.(language));
    socket.on("output-update", ({ output }) => handlersRef.current.onOutputUpdate?.(output));
    socket.on("timeline-event", (event) => setTimelineEvents((prev) => [...prev, event]));
    socket.on("peer-id-received", ({ peerId }) => handlersRef.current.onPeerIdReceived?.(peerId));
    socket.on("interview-started", ({ interviewId }) => handlersRef.current.onInterviewStarted?.(interviewId));
    socket.on("whiteboard-draw", ({ stroke }) => handlersRef.current.onWhiteboardDraw?.(stroke));
    socket.on("whiteboard-clear", () => handlersRef.current.onWhiteboardClear?.());
    socket.on("remote-camera-toggle", ({ isOff }) => handlersRef.current.onRemoteCameraToggle?.(isOff));
    socket.on("remote-mic-toggle", ({ isMuted }) => handlersRef.current.onRemoteMicToggle?.(isMuted));
    socket.on("candidate-unlocked", () => handlersRef.current.onCandidateUnlocked?.());
    socket.on("remote-cursor", (data) => handlersRef.current.onRemoteCursor?.(data));
    socket.on("timer-sync", (data) => handlersRef.current.onTimerSync?.(data));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setUsers([]);
      setMessages([]);
      setServerStateLost(false);
      setTimelineEvents([]);
      hasConnectedOnceRef.current = false;
      reconnectDetectedRef.current = false;
    };
  }, [roomId, userName, role]);

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
    isConnected,
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
