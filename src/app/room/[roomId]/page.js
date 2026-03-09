"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG } from "@/components/editor/CodeEditor";
import OutputPanel from "@/components/editor/OutputPanel";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(LANGUAGE_CONFIG["javascript"].defaultCode);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

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

  async function handleRunCode() {
    if (isRunning) return;
    if (!code.trim()) {
      setOutput({
        status: "error",
        output: "No code to run",
        type: "Error",
      });
      return;
    }

    setIsRunning(true);
    setOutput(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOutput({
          status: "error",
          output: data.error || "Execution failed",
          type: "Error",
        });
        return;
      }

      setOutput(data);
    } catch {
      setOutput({
        status: "error",
        output: "Failed to connect to execution server",
        type: "Error",
      });
    } finally {
      setIsRunning(false);
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
          <a href="/dashboard" className="text-blue-400 hover:text-blue-300">
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

        {/* Right: Run Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              isRunning
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isRunning ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Running...
              </>
            ) : (
              <>▶ Run Code</>
            )}
          </button>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-900/30 text-green-400 border border-green-800">
            ● Live
          </span>
        </div>
      </div>

      {/* Main Content: Editor + Output */}
      <div className="flex-1 flex flex-col">
        {/* Editor - 65% height */}
        <div className="flex-1" style={{ minHeight: "60%" }}>
          <CodeEditor
            language={language}
            onLanguageChange={setLanguage}
            code={code}
            onCodeChange={setCode}
          />
        </div>

        {/* Output Panel - 35% height */}
        <div style={{ height: "35%" }}>
          <OutputPanel output={output} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
}