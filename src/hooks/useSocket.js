"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

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
  });

  useEffect(() => {
    if (!roomId || !userName) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const socket = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (hasConnectedOnceRef.current) {
        reconnectDetectedRef.current = true;
      }
      hasConnectedOnceRef.current = true;
      setIsConnected(true);
      socket.emit("join-room", { roomId, userName, role });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("room-state", ({ code, language, users, messages, interviewId, events, focusMode, isEmptyRoom }) => {
      setUsers(users || []);
      setMessages(messages?.slice(-MAX_MESSAGES) || []);
      setTimelineEvents(events || []);

      if (reconnectDetectedRef.current && isEmptyRoom) {
        setServerStateLost(true);
      } else {
        setServerStateLost(false);
        reconnectDetectedRef.current = false;
      }

      if (reconnectDetectedRef.current) {
        if (code !== undefined) handlersRef.current.onCodeUpdate?.(code);
        if (language !== undefined) handlersRef.current.onLanguageUpdate?.(language);
      }

      if (typeof focusMode === "boolean") handlersRef.current.onFocusModeChanged?.(focusMode);

      if (interviewId && handlersRef.current.onInterviewStarted) {
        handlersRef.current.onInterviewStarted(interviewId);
      }
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

    // Route all dynamic events through stable handler refs
    socket.on("code-update", ({ code }) => {
      handlersRef.current.onCodeUpdate?.(code);
    });
    socket.on("language-update", ({ language }) => {
      handlersRef.current.onLanguageUpdate?.(language);
    });
    socket.on("output-update", ({ output }) => {
      handlersRef.current.onOutputUpdate?.(output);
    });
    socket.on("timeline-event", (event) => {
      setTimelineEvents((prev) => [...prev, event]);
    });

    socket.on("peer-id-received", ({ peerId }) => {
      handlersRef.current.onPeerIdReceived?.(peerId);
    });
    socket.on("interview-started", ({ interviewId }) => {
      handlersRef.current.onInterviewStarted?.(interviewId);
    });
    socket.on("whiteboard-draw", ({ stroke }) => {
      handlersRef.current.onWhiteboardDraw?.(stroke);
    });
    socket.on("whiteboard-clear", () => {
      handlersRef.current.onWhiteboardClear?.();
    });

    socket.on("remote-camera-toggle", ({ isOff }) => {
      handlersRef.current.onRemoteCameraToggle?.(isOff);
    });

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

  const emitSetFocusMode = useCallback(
    (enabled) => socketRef.current?.emit("set-focus-mode", { roomId, enabled }),
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

  const onWhiteboardClear = useCallback((handler) => {
    handlersRef.current.onWhiteboardClear = handler;
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
    emitSetFocusMode,
    emitWhiteboardDraw,
    emitWhiteboardClear,
    onRemoteCameraToggle,
    onWhiteboardDraw,
    onWhiteboardClear,
    onCodeUpdate,
    onLanguageUpdate,
    onOutputUpdate,
    onPeerIdReceived,
    onInterviewStarted,
    onFocusModeChanged,
  };
}
