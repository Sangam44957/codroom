"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG } from "@/components/editor/CodeEditor";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(LANGUAGE_CONFIG["javascript"].defaultCode);

  useEffect(() => {
    fetchRoom();
  }, []);

  async function fetchRoom() {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Room not found");
        return;
      }

      setRoom(data.room);
      setLanguage(data.room.language || "javascript");
      setCode(
        LANGUAGE_CONFIG[data.room.language || "javascript"]?.defaultCode || ""
      );
    } catch {
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-gray-400 text-lg">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
          <a
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Room Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        {/* Left: Room Info */}
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-lg font-bold text-white hover:text-blue-400 transition-all"
          >
            CodRoom
          </a>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300 text-sm">{room.title}</span>
          {room.candidateName && (
            <>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 text-sm">
                {room.candidateName}
              </span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-900/30 text-green-400 border border-green-800">
            ● Live
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Code Editor - Takes full width for now */}
        <div className="flex-1">
          <CodeEditor
            language={language}
            onLanguageChange={setLanguage}
            code={code}
            onCodeChange={setCode}
          />
        </div>
      </div>
    </div>
  );
}
