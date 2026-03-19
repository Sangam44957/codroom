"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export default function useSocket(roomId, userName, role) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Don't connect until roomId and userName are both available
    if (!roomId || !userName) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const socket = io(socketUrl, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-room", { roomId, userName, role });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room-state", ({ users, messages }) => {
      setUsers(users || []);
      setMessages(messages || []);
    });

    socket.on("user-joined", ({ users }) => {
      setUsers(users || []);
    });

    socket.on("user-left", ({ users }) => {
      setUsers(users || []);
    });

    socket.on("chat-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setUsers([]);
      setMessages([]);
    };
  }, [roomId, userName, role]);

  // ─── Emit helpers ────────────────────────────────────────────

  const emitCodeChange = useCallback(
    (code) => {
      socketRef.current?.emit("code-change", { roomId, code });
    },
    [roomId]
  );

  const emitLanguageChange = useCallback(
    (language) => {
      socketRef.current?.emit("language-change", { roomId, language });
    },
    [roomId]
  );

  const emitCodeOutput = useCallback(
    (output) => {
      socketRef.current?.emit("code-output", { roomId, output });
    },
    [roomId]
  );

  const sendMessage = useCallback(
    (text) => {
      socketRef.current?.emit("send-message", { roomId, text, sender: userName, role });
    },
    [roomId, userName, role]
  );

  const sharePeerId = useCallback(
    (peerId) => {
      socketRef.current?.emit("share-peer-id", { roomId, peerId });
    },
    [roomId]
  );

  // Tell the socket server which interviewId is active
  // so it can record snapshots against it
  const emitSetInterviewId = useCallback(
    (interviewId) => {
      socketRef.current?.emit("set-interview-id", { roomId, interviewId });
    },
    [roomId]
  );

  // ─── Event listener registration helpers ─────────────────────

  const onCodeUpdate = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off("code-update");
    socket.on("code-update", ({ code }) => handler(code));
  }, []);

  const onLanguageUpdate = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off("language-update");
    socket.on("language-update", ({ language }) => handler(language));
  }, []);

  const onOutputUpdate = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off("output-update");
    socket.on("output-update", ({ output }) => handler(output));
  }, []);

  const onPeerIdReceived = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off("peer-id-received");
    socket.on("peer-id-received", ({ peerId }) => handler(peerId));
  }, []);

  // Listen for interview-started event (so candidates can see the timer too)
  const onInterviewStarted = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off("interview-started");
    socket.on("interview-started", ({ interviewId }) => handler(interviewId));
  }, []);

  return {
    isConnected,
    users,
    messages,
    emitCodeChange,
    emitLanguageChange,
    emitCodeOutput,
    sendMessage,
    sharePeerId,
    emitSetInterviewId,
    onCodeUpdate,
    onLanguageUpdate,
    onOutputUpdate,
    onPeerIdReceived,
    onInterviewStarted,
  };
}
