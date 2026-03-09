"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

export default function useSocket(roomId, userName, role) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);

  // Store callbacks in refs so they don't cause re-renders
  const onCodeUpdateRef = useRef(null);
  const onLanguageUpdateRef = useRef(null);
  const onOutputUpdateRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userName) return;

    // Create socket connection
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to socket server");
      setIsConnected(true);

      // Join the room
      socket.emit("join-room", { roomId, userName, role });
    });

    // Receive current room state
    socket.on("room-state", ({ code, language, users: roomUsers }) => {
      setUsers(roomUsers);
      if (onCodeUpdateRef.current && code) {
        onCodeUpdateRef.current(code);
      }
      if (onLanguageUpdateRef.current && language) {
        onLanguageUpdateRef.current(language);
      }
    });

    // Someone joined
    socket.on("user-joined", ({ user, users: roomUsers }) => {
      setUsers(roomUsers);
      console.log(`👤 ${user.name} joined`);
    });

    // Someone left
    socket.on("user-left", ({ user, users: roomUsers }) => {
      setUsers(roomUsers);
      console.log(`👤 ${user.name} left`);
    });

    // Code update from other user
    socket.on("code-update", ({ code }) => {
      if (onCodeUpdateRef.current) {
        onCodeUpdateRef.current(code);
      }
    });

    // Language update from other user
    socket.on("language-update", ({ language }) => {
      if (onLanguageUpdateRef.current) {
        onLanguageUpdateRef.current(language);
      }
    });

    // Output update from other user
    socket.on("output-update", ({ output }) => {
      if (onOutputUpdateRef.current) {
        onOutputUpdateRef.current(output);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [roomId, userName, role]);

  // Send code change to server
  const emitCodeChange = useCallback(
    (code) => {
      if (socketRef.current) {
        socketRef.current.emit("code-change", { roomId, code });
      }
    },
    [roomId]
  );

  // Send language change to server
  const emitLanguageChange = useCallback(
    (language) => {
      if (socketRef.current) {
        socketRef.current.emit("language-change", { roomId, language });
      }
    },
    [roomId]
  );

  // Send output to other user
  const emitCodeOutput = useCallback(
    (output) => {
      if (socketRef.current) {
        socketRef.current.emit("code-output", { roomId, output });
      }
    },
    [roomId]
  );

  // Register callbacks
  const onCodeUpdate = useCallback((callback) => {
    onCodeUpdateRef.current = callback;
  }, []);

  const onLanguageUpdate = useCallback((callback) => {
    onLanguageUpdateRef.current = callback;
  }, []);

  const onOutputUpdate = useCallback((callback) => {
    onOutputUpdateRef.current = callback;
  }, []);

  return {
    isConnected,
    users,
    emitCodeChange,
    emitLanguageChange,
    emitCodeOutput,
    onCodeUpdate,
    onLanguageUpdate,
    onOutputUpdate,
  };
}