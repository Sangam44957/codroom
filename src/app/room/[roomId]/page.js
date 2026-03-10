"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG } from "@/components/editor/CodeEditor";
import OutputPanel from "@/components/editor/OutputPanel";
import ChatPanel from "@/components/ui/ChatPanel";
import NotesPanel from "@/components/ui/NotesPanel";
import VideoPanel from "@/components/video/VideoPanel";
import useSocket from "@/hooks/useSocket";

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
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState("candidate");
  const [joined, setJoined] = useState(false);
  const [activePanel, setActivePanel] = useState("chat");
  const [showVideo, setShowVideo] = useState(false);

  const {
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
  } = useSocket(joined ? roomId : null, userName, role);

  useEffect(() => {
    onCodeUpdate((newCode) => setCode(newCode));
    onLanguageUpdate((newLang) => setLanguage(newLang));
    onOutputUpdate((newOutput) => setOutput(newOutput));
  }, [onCodeUpdate, onLanguageUpdate, onOutputUpdate]);

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
      setCode(LANGUAGE_CONFIG[data.room.language || "javascript"]?.defaultCode || "");

      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user.userId === data.room.createdById) {
            setRole("interviewer");
            setUserName(meData.user.name);
            setJoined(true);
          }
        }
      } catch {
        // Not logged in
      }
    } catch {
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  }

  const handleCodeChange = useCallback(
    (newCode) => {
      setCode(newCode);
      emitCodeChange(newCode);
    },
    [emitCodeChange]
  );

  const handleLanguageChange = useCallback(
    (newLang) => {
      setLanguage(newLang);
      setCode(LANGUAGE_CONFIG[newLang]?.defaultCode || "");
      emitLanguageChange(newLang);
    },
    [emitLanguageChange]
  );

  async function handleRunCode() {
    if (isRunning) return;
    if (!code.trim()) {
      setOutput({ status: "error", output: "No code to run", type: "Error" });
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
        const errOutput = { status: "error", output: data.error || "Execution failed", type: "Error" };
        setOutput(errOutput);
        emitCodeOutput(errOutput);
        return;
      }

      setOutput(data);
      emitCodeOutput(data);
    } catch {
      const errOutput = { status: "error", output: "Failed to connect", type: "Error" };
      setOutput(errOutput);
      emitCodeOutput(errOutput);
    } finally {
      setIsRunning(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    if (userName.trim()) setJoined(true);
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
          <a href="/dashboard" className="text-blue-400 hover:text-blue-300">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">CodRoom</h1>
            <p className="text-gray-400">Join the interview</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-semibold text-white mb-2">{room.title}</h2>
            <p className="text-gray-400 text-sm mb-6">Enter your name to join the coding session</p>
            <form onSubmit={handleJoin}>
              <input
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
              />
              <button
                type="submit"
                disabled={!userName.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Room Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-lg font-bold text-white hover:text-blue-400 transition-all">
            CodRoom
          </a>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300 text-sm">{room.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {users.map((user) => (
            <span
              key={user.id}
              className={`px-3 py-1 text-xs rounded-full ${
                user.role === "interviewer"
                  ? "bg-purple-900/30 text-purple-400 border border-purple-800"
                  : "bg-blue-900/30 text-blue-400 border border-blue-800"
              }`}
            >
              {user.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Video Toggle */}
          <button
            onClick={() => setShowVideo(!showVideo)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              showVideo
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            🎥 Video
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === "chat" ? null : "chat")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              activePanel === "chat"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            💬 Chat
          </button>

          {/* Notes Toggle (interviewer only) */}
          {role === "interviewer" && (
            <button
              onClick={() => setActivePanel(activePanel === "notes" ? null : "notes")}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                activePanel === "notes"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              📝 Notes
            </button>
          )}

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-5 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              isRunning
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isRunning ? "Running..." : "▶ Run Code"}
          </button>

          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              isConnected
                ? "bg-green-900/30 text-green-400 border border-green-800"
                : "bg-red-900/30 text-red-400 border border-red-800"
            }`}
          >
            {isConnected ? "● Connected" : "● Disconnected"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor + Output */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1" style={{ minHeight: "60%" }}>
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              code={code}
              onCodeChange={handleCodeChange}
            />
          </div>
          <div style={{ height: "35%" }}>
            <OutputPanel output={output} isRunning={isRunning} />
          </div>
        </div>

        {/* Right: Side Panel */}
        {(activePanel || showVideo) && (
          <div className="w-80 flex flex-col border-l border-gray-800">
            {/* Video at top of side panel */}
            {showVideo && (
              <div className="p-3 border-b border-gray-800">
                <VideoPanel
                  roomId={roomId}
                  userName={userName}
                  sharePeerId={sharePeerId}
                  onPeerIdReceived={onPeerIdReceived}
                />
              </div>
            )}

            {/* Chat or Notes below video */}
            {activePanel && (
              <div className="flex-1 overflow-hidden">
                {activePanel === "chat" && (
                  <ChatPanel
                    messages={messages}
                    onSendMessage={sendMessage}
                    userName={userName}
                  />
                )}
                {activePanel === "notes" && (
                  <NotesPanel roomId={roomId} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}