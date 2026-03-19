"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG } from "@/components/editor/CodeEditor";
import OutputPanel from "@/components/editor/OutputPanel";
import ProblemPanel from "@/components/editor/ProblemPanel";
import ChatPanel from "@/components/ui/ChatPanel";
import NotesPanel from "@/components/ui/NotesPanel";
import VideoPanel from "@/components/video/VideoPanel";
import useSocket from "@/hooks/useSocket";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(LANGUAGE_CONFIG["javascript"].defaultCode);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showProblem, setShowProblem] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [rightTab, setRightTab] = useState("chat"); // "chat" | "notes" | "video"

  const [session, setSession] = useState({
    userName: "",
    role: "candidate",
    joined: false,
  });

  const [interviewId, setInterviewId] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("waiting");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const {
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
  } = useSocket(session.joined ? roomId : null, session.userName, session.role);

  useEffect(() => {
    onCodeUpdate((newCode) => setCode(newCode));
    onLanguageUpdate((newLang) => setLanguage(newLang));
    onOutputUpdate((newOutput) => setOutput(newOutput));
  }, [onCodeUpdate, onLanguageUpdate, onOutputUpdate]);

  useEffect(() => {
    onInterviewStarted((id) => {
      setInterviewId(id);
      setInterviewStatus("in_progress");
    });
  }, [onInterviewStarted]);

  useEffect(() => {
    if (interviewStatus === "in_progress") {
      timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [interviewStatus]);

  useEffect(() => {
    fetchRoom();
  }, []);

  function formatTimer(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  async function fetchRoom() {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Room not found"); return; }

      setRoom(data.room);
      setLanguage(data.room.language || "javascript");
      setCode(
        data.room.problem?.starterCode ||
        LANGUAGE_CONFIG[data.room.language || "javascript"]?.defaultCode || ""
      );
      setShowProblem(!!data.room.problem);

      if (data.room.interview) {
        setInterviewId(data.room.interview.id);
        setInterviewStatus(data.room.interview.status);
      }

      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user.userId === data.room.createdById) {
            setSession({ userName: meData.user.name, role: "interviewer", joined: true });
          }
        }
      } catch {}
    } catch {
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartInterview() {
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, language }),
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewId(data.interview.id);
        setInterviewStatus("in_progress");
        emitSetInterviewId(data.interview.id);
      } else {
        alert(data.error || "Failed to start interview");
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
    }
  }

  async function handleEndInterview() {
    if (!confirm("Are you sure you want to end this interview?")) return;
    try {
      const res = await fetch(`/api/interviews/${interviewId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCode: code, language }),
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewStatus("completed");
        router.push(`/room/${roomId}/playback`);
      } else {
        alert(data.error || "Failed to end interview");
      }
    } catch (err) {
      console.error("Failed to end interview:", err);
    }
  }

  const handleCodeChange = useCallback(
    (newCode) => { setCode(newCode); emitCodeChange(newCode); },
    [emitCodeChange]
  );

  const handleLanguageChange = useCallback(
    (newLang) => {
      setLanguage(newLang);
      if (!room?.problem?.starterCode) setCode(LANGUAGE_CONFIG[newLang]?.defaultCode || "");
      emitLanguageChange(newLang);
    },
    [emitLanguageChange, room]
  );

  async function handleRunCode() {
    if (isRunning || !code.trim()) {
      if (!code.trim()) setOutput({ status: "error", output: "No code to run", type: "Error" });
      return;
    }
    setIsRunning(true);
    setOutput(null);
    setShowOutput(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      const result = res.ok ? data : { status: "error", output: data.error || "Execution failed", type: "Error" };
      setOutput(result);
      emitCodeOutput(result);
    } catch {
      const err = { status: "error", output: "Failed to connect to execution server", type: "Error" };
      setOutput(err);
      emitCodeOutput(err);
    } finally {
      setIsRunning(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    if (name) setSession({ userName: name, role: "candidate", joined: true });
  }

  // ─── Loading / Error / Join screens ──────────────────────────

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

  if (!session.joined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">CodRoom</h1>
            <p className="text-gray-400">Join the interview</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-semibold text-white mb-1">{room.title}</h2>
            {room.problem && <p className="text-blue-400 text-sm mb-2">Problem: {room.problem.title}</p>}
            <p className="text-gray-400 text-sm mb-6">Enter your name to join</p>
            <form onSubmit={handleJoin}>
              <input
                name="name"
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
              />
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Room UI ─────────────────────────────────────────────

  const isInterviewer = session.role === "interviewer";

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">

      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/dashboard" className="text-base font-bold text-white hover:text-blue-400 transition-all flex-shrink-0">
            CodRoom
          </a>
          <span className="text-gray-700">|</span>
          <span className="text-gray-300 text-sm truncate max-w-[200px]">{room.title}</span>
          {room.problem && (
            <span className="text-blue-400 text-xs bg-blue-900/20 border border-blue-800 px-2 py-0.5 rounded-full truncate max-w-[150px]">
              {room.problem.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Timer */}
          {interviewStatus === "in_progress" && (
            <span className="font-mono text-sm text-white bg-gray-800 border border-gray-700 px-3 py-1 rounded-lg">
              ⏱ {formatTimer(timer)}
            </span>
          )}
          {interviewStatus === "completed" && (
            <span className="text-xs text-orange-400 bg-orange-900/20 border border-orange-800 px-3 py-1 rounded-lg">
              ✓ Completed
            </span>
          )}

          {/* Online users */}
          <div className="flex items-center gap-1">
            {users.map((u) => (
              <span
                key={u.id}
                className={`px-2 py-0.5 text-xs rounded-full ${
                  u.role === "interviewer"
                    ? "bg-purple-900/30 text-purple-400 border border-purple-800"
                    : "bg-blue-900/30 text-blue-400 border border-blue-800"
                }`}
              >
                {u.name}
              </span>
            ))}
          </div>

          {/* Connection dot */}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            isConnected
              ? "bg-green-900/30 text-green-400 border-green-800"
              : "bg-red-900/30 text-red-400 border-red-800"
          }`}>
            {isConnected ? "● Live" : "● Off"}
          </span>
        </div>
      </div>

      {/* ── Toolbar Strip ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900/60 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {room.problem && (
            <button
              onClick={() => setShowProblem(!showProblem)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                showProblem ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              📋 Problem
            </button>
          )}
          <button
            onClick={() => setShowOutput(!showOutput)}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              showOutput ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {showOutput ? "▼ Output" : "▶ Output"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Run */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-5 py-1 rounded-md font-medium text-sm transition-all ${
              isRunning ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isRunning ? "⏳ Running..." : "▶ Run"}
          </button>

          {/* Interview controls — interviewer only */}
          {isInterviewer && interviewStatus === "waiting" && (
            <button
              onClick={handleStartInterview}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md font-medium transition-all"
            >
              🎬 Start Interview
            </button>
          )}
          {isInterviewer && interviewStatus === "in_progress" && (
            <button
              onClick={handleEndInterview}
              className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md font-medium transition-all"
            >
              🏁 End Interview
            </button>
          )}
          {isInterviewer && interviewStatus === "completed" && (
            <button
              onClick={() => router.push(`/room/${roomId}/playback`)}
              className="px-4 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md font-medium transition-all"
            >
              🎬 Playback
            </button>
          )}
        </div>
      </div>

      {/* ── Main 3-column body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Problem Panel */}
        {showProblem && room.problem && (
          <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-hidden">
            <ProblemPanel problem={room.problem} />
          </div>
        )}

        {/* Center: Editor + Output */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className={`${showOutput ? "flex-1" : "h-full"} overflow-hidden`}>
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              code={code}
              onCodeChange={handleCodeChange}
            />
          </div>

          {showOutput && (
            <div className="h-48 flex-shrink-0 border-t border-gray-800 overflow-hidden">
              <OutputPanel output={output} isRunning={isRunning} />
            </div>
          )}
        </div>

        {/* Right: Tabbed Panel */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-gray-800 bg-gray-900">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            {["chat", ...(isInterviewer ? ["notes"] : []), "video"].map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-all ${
                  rightTab === tab
                    ? "text-white border-b-2 border-blue-500 bg-gray-800/50"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "chat" && "💬 Chat"}
                {tab === "notes" && "📝 Notes"}
                {tab === "video" && "🎥 Video"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === "chat" && (
              <ChatPanel messages={messages} onSendMessage={sendMessage} userName={session.userName} />
            )}
            {rightTab === "notes" && isInterviewer && (
              <NotesPanel roomId={roomId} />
            )}
            {rightTab === "video" && (
              <div className="h-full overflow-y-auto p-3">
                <VideoPanel
                  isActive={rightTab === "video"}
                  sharePeerId={sharePeerId}
                  onPeerIdReceived={onPeerIdReceived}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
