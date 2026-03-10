"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

// FOR LOCALHOST ONLY (same computer):
const SOCKET_URL = "http://localhost:3001";

// FOR LOCAL NETWORK ACCESS (other devices on same WiFi):
// const SOCKET_URL = "http://10.170.232.122:3001";

// FOR PRODUCTION (after deployment):
// const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function useSocket(roomId, userName, role) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);

  const onCodeUpdateRef = useRef(null);
  const onLanguageUpdateRef = useRef(null);
  const onOutputUpdateRef = useRef(null);
  const onPeerIdReceivedRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userName) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to socket server");
      setIsConnected(true);
      socket.emit("join-room", { roomId, userName, role });
    });

    socket.on("room-state", ({ code, language, users: roomUsers, messages: roomMessages }) => {
      setUsers(roomUsers);
      if (roomMessages) setMessages(roomMessages);
      if (onCodeUpdateRef.current && code) onCodeUpdateRef.current(code);
      if (onLanguageUpdateRef.current && language) onLanguageUpdateRef.current(language);
    });

    socket.on("user-joined", ({ user, users: roomUsers }) => {
      setUsers(roomUsers);
      console.log(`👤 ${user.name} joined`);
    });

    socket.on("user-left", ({ user, users: roomUsers }) => {
      setUsers(roomUsers);
      console.log(`👤 ${user.name} left`);
    });

    socket.on("code-update", ({ code }) => {
      if (onCodeUpdateRef.current) onCodeUpdateRef.current(code);
    });

    socket.on("language-update", ({ language }) => {
      if (onLanguageUpdateRef.current) onLanguageUpdateRef.current(language);
    });

    socket.on("output-update", ({ output }) => {
      if (onOutputUpdateRef.current) onOutputUpdateRef.current(output);
    });

    socket.on("chat-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Video: receive peer ID from other user
    socket.on("peer-id-received", ({ peerId, socketId }) => {
      if (onPeerIdReceivedRef.current) {
        onPeerIdReceivedRef.current(peerId, socketId);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userName, role]);

  const emitCodeChange = useCallback(
    (code) => {
      if (socketRef.current) socketRef.current.emit("code-change", { roomId, code });
    },
    [roomId]
  );

  const emitLanguageChange = useCallback(
    (language) => {
      if (socketRef.current) socketRef.current.emit("language-change", { roomId, language });
    },
    [roomId]
  );

  const emitCodeOutput = useCallback(
    (output) => {
      if (socketRef.current) socketRef.current.emit("code-output", { roomId, output });
    },
    [roomId]
  );

  const sendMessage = useCallback(
    (text) => {
      if (socketRef.current && text.trim()) {
        socketRef.current.emit("send-message", { roomId, text: text.trim(), sender: userName, role });
      }
    },
    [roomId, userName, role]
  );

  // Share peer ID with room
  const sharePeerId = useCallback(
    (peerId) => {
      if (socketRef.current) {
        socketRef.current.emit("share-peer-id", { roomId, peerId });
      }
    },
    [roomId]
  );

  const onCodeUpdate = useCallback((cb) => { onCodeUpdateRef.current = cb; }, []);
  const onLanguageUpdate = useCallback((cb) => { onLanguageUpdateRef.current = cb; }, []);
  const onOutputUpdate = useCallback((cb) => { onOutputUpdateRef.current = cb; }, []);
  const onPeerIdReceived = useCallback((cb) => { onPeerIdReceivedRef.current = cb; }, []);

  return {
    isConnected,
    users,
    messages,
    emitCodeChange,
    emitLanguageChange,
    emitCodeOutput,
    sendMessage,
    sharePeerId,
    onCodeUpdate,
    onLanguageUpdate,
    onOutputUpdate,
    onPeerIdReceived,
  };
}