"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG } from "@/components/editor/CodeEditor";
import OutputPanel from "@/components/editor/OutputPanel";
import ProblemPanel from "@/components/editor/ProblemPanel";
import TestCaseRunner from "@/components/editor/TestCaseRunner";
import ChatPanel from "@/components/ui/ChatPanel";
import NotesPanel from "@/components/ui/NotesPanel";
import SecurityWarning from "@/components/ui/SecurityWarning";
import SecurityPanel from "@/components/ui/SecurityPanel";
import VideoPanel from "@/components/video/VideoPanel";
import useSocket from "@/hooks/useSocket";
import useSecurityMonitor from "@/hooks/useSecurityMonitor";
import { toast } from "sonner";
import {
  Play, Square, SkipForward, Wifi, WifiOff, Clock,
  MessageSquare, StickyNote, Video, Shield, ChevronLeft,
  ChevronRight, GripVertical, Trash2, LayoutPanelLeft
} from "lucide-react";

// ── Resizable divider ──────────────────────────────────────────
function ResizeDivider({ onDrag }) {
  const dragging = useRef(false);

  function onMouseDown(e) {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev) {
      if (dragging.current) onDrag(ev.clientX);
    }
    function onUp() {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 flex-shrink-0 bg-white/[0.04] hover:bg-violet-500/40 cursor-col-resize flex items-center justify-center group transition-colors"
      title="Drag to resize"
    >
      <GripVertical size={12} className="text-white/20 group-hover:text-violet-400 transition-colors" />
    </div>
  );
}

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
  const [rightTab, setRightTab] = useState("chat");
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Resizable problem panel width (px)
  const [problemWidth, setProblemWidth] = useState(320);
  const containerRef = useRef(null);

  const [session, setSession] = useState({ userName: "", role: "candidate", joined: false });
  const [interviewId, setInterviewId] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("waiting");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const { violations, warningCount, isFullscreen, requestFullscreen } = useSecurityMonitor(
    interviewStatus === "in_progress" && session.role === "candidate",
    (violation) => {
      setShowSecurityWarning(true);
      sendMessage(`⚠️ Security: ${violation.details}`);
    }
  );

  const {
    isConnected, serverStateLost, users, messages, timelineEvents,
    emitCodeChange, emitLanguageChange, emitCodeOutput, emitTimelineEvent,
    sendMessage, sharePeerId, emitSetInterviewId,
    onCodeUpdate, onLanguageUpdate, onOutputUpdate, onPeerIdReceived, onInterviewStarted,
  } = useSocket(session.joined ? roomId : null, session.userName, session.role);

  useEffect(() => {
    onCodeUpdate((c) => setCode(c));
    onLanguageUpdate((l) => setLanguage(l));
    onOutputUpdate((o) => setOutput(o));
    onInterviewStarted((id) => {
      setInterviewId(id);
      setInterviewStatus((prev) => (prev === "waiting" ? "in_progress" : prev));
    });
  }, [onCodeUpdate, onLanguageUpdate, onOutputUpdate, onInterviewStarted]);

  useEffect(() => {
    if (interviewStatus === "in_progress" && session.role === "candidate") requestFullscreen();
  }, [interviewStatus, session.role, requestFullscreen]);

  useEffect(() => {
    if (interviewStatus === "in_progress") {
      timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [interviewStatus]);

  useEffect(() => { fetchRoom(); }, []);

  function formatTimer(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  async function fetchRoom() {
    try {
      const rawToken = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("joinToken") : null;

      if (rawToken) {
        const exchangeRes = await fetch(`/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ joinToken: rawToken }),
        });
        if (!exchangeRes.ok) {
          const d = await exchangeRes.json().catch(() => ({}));
          setError(d.error || "Invalid invite link");
          setLoading(false);
          return;
        }
        window.history.replaceState({}, "", `/room/${roomId}`);
      }

      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Room not found"); return; }

      setRoom(data.room);
      setLanguage(data.room.language || "javascript");
      setCode(data.room.problem?.starterCode || LANGUAGE_CONFIG[data.room.language || "javascript"]?.defaultCode || "");
      setShowProblem(!!data.room.problem);

      if (data.room.interview) {
        setInterviewId(data.room.interview.id);
        setInterviewStatus(data.room.interview.status);
      }

      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          const myId = meData.user?.userId ?? meData.user?.id;
          if (myId && myId === data.room.createdById) {
            setSession({ userName: meData.user.name, role: "interviewer", joined: true });
          }
        }
      } catch {}
    } catch { setError("Failed to load room"); }
    finally { setLoading(false); }
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
        toast.success("Interview started!");
      } else toast.error(data.error || "Failed to start interview");
    } catch (err) { console.error(err); toast.error("Failed to start interview"); }
  }

  async function handleEndInterview() {
    if (!confirm("End this interview?")) return;
    try {
      const res = await fetch(`/api/interviews/${interviewId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCode: code, language }),
      });
      if (res.ok) {
        setInterviewStatus("completed");
        toast.success("Interview ended. Generating report...");
        router.push(`/room/${roomId}/report`);
      } else { const d = await res.json(); toast.error(d.error || "Failed to end interview"); }
    } catch (err) { console.error(err); toast.error("Failed to end interview"); }
  }

  async function handleDeleteInterview() {
    const interviewId2 = room?.interview?.id;
    if (!interviewId2) return;
    if (!confirm("Delete this interview? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId2}`, { method: "DELETE" });
      if (res.ok) { toast.success("Interview deleted"); router.push("/dashboard"); }
      else toast.error("Delete failed.");
    } finally { setDeleting(false); }
  }

  const handleCodeChange = useCallback(
    (c) => { setCode(c); emitCodeChange(c); }, [emitCodeChange]
  );

  const handleLanguageChange = useCallback(
    (l) => {
      setLanguage(l);
      if (!room?.problem?.starterCode) setCode(LANGUAGE_CONFIG[l]?.defaultCode || "");
      emitLanguageChange(l);
    }, [emitLanguageChange, room]
  );

  async function handleRunCode() {
    if (isRunning || !code.trim()) {
      if (!code.trim()) setOutput({ status: "error", output: "No code to run", type: "Error" });
      return;
    }
    setIsRunning(true); setOutput(null); setShowOutput(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
        signal: controller.signal,
      });
      const data = await res.json();
      const result = res.ok ? data : { status: "error", output: data.error || "Execution failed", type: "Error" };
      setOutput(result);
      emitCodeOutput(result);
      if (result.status === "error") toast.error("Execution failed");
      else toast.success("Code executed successfully");
      emitTimelineEvent({ type: result.status === "error" ? "run_fail" : "run_pass", label: result.status === "error" ? "Run Failed" : "Run Passed" });
    } catch (err) {
      const isTimeout = err.name === "AbortError";
      const result = { status: "error", output: isTimeout ? "Request timed out (15s)." : "Failed to connect to execution server", type: isTimeout ? "Timeout" : "Error" };
      setOutput(result); emitCodeOutput(result);
    } finally { clearTimeout(timeoutId); setIsRunning(false); }
  }

  function handleJoin(e) {
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    if (name) setSession({ userName: name, role: "candidate", joined: true });
  }

  // Resize handler
  function handleProblemResize(clientX) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = Math.min(600, Math.max(220, clientX - rect.left));
    setProblemWidth(newWidth);
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0d14]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0d14]">
        <div className="text-center">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-lg font-semibold text-white mb-2">{error}</h2>
          <a href="/dashboard" className="text-violet-400 hover:text-violet-300 text-sm">← Dashboard</a>
        </div>
      </div>
    );
  }

  // ── Join screen ──
  if (!session.joined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0d14] px-4">
        <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl font-black text-white">C</div>
            <h1 className="text-2xl font-black text-white mb-1">{room.title}</h1>
            {room.problem && <p className="text-violet-400 text-sm">Problem: {room.problem.title}</p>}
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7">
            <p className="text-slate-500 text-sm mb-5 text-center">Enter your name to join the interview</p>
            <form onSubmit={handleJoin}>
              <input
                name="name" type="text" placeholder="Your name"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 mb-4 transition-all"
                autoFocus
              />
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all">
                Join Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isInterviewer = session.role === "interviewer";
  const rightTabs = ["chat", ...(isInterviewer ? ["notes", "security"] : []), "video"];

  const TAB_META = {
    chat:     { icon: MessageSquare, label: "Chat" },
    notes:    { icon: StickyNote,    label: "Notes" },
    security: { icon: Shield,        label: "Security", badge: violations.length },
    video:    { icon: Video,         label: "Video" },
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d14] overflow-hidden text-slate-200">

      {showSecurityWarning && (
        <SecurityWarning warningCount={warningCount} onDismiss={() => setShowSecurityWarning(false)} />
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 h-11 bg-[#111118] border-b border-white/[0.06] flex-shrink-0 gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <a href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0 text-sm font-bold">
            <LayoutPanelLeft size={15} />
            <span className="hidden sm:inline">CodRoom</span>
          </a>
          <span className="text-white/10">|</span>
          <span className="text-slate-400 text-sm truncate max-w-[140px] sm:max-w-[220px]">{room.title}</span>
          {room.problem && (
            <span className="hidden md:inline text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full truncate max-w-[140px]">
              {room.problem.title}
            </span>
          )}
        </div>

        {/* Center — timer + status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {interviewStatus === "in_progress" && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-white bg-white/[0.06] border border-white/[0.08] px-3 py-1 rounded-lg">
              <Clock size={11} className="text-violet-400" />
              {formatTimer(timer)}
            </span>
          )}
          {interviewStatus === "completed" && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
              ✓ Completed
            </span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Users */}
          <div className="hidden sm:flex items-center gap-1">
            {users.map((u) => (
              <span key={u.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                u.role === "interviewer"
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              }`}>{u.name}</span>
            ))}
          </div>

          {/* Connection */}
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
            isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}>
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            <span className="hidden sm:inline">{isConnected ? "Live" : "Off"}</span>
          </span>

          {serverStateLost && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">⚠ State lost</span>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 h-9 bg-[#0f0f17] border-b border-white/[0.05] flex-shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          {room.problem && (
            <button
              onClick={() => setShowProblem(!showProblem)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all ${
                showProblem ? "bg-violet-600/20 text-violet-300 border border-violet-500/30" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
              }`}
            >
              {showProblem ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
              Problem
            </button>
          )}
          <button
            onClick={() => setShowOutput(!showOutput)}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${
              showOutput ? "bg-white/[0.07] text-slate-300" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
            }`}
          >
            Output
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Run */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-md text-xs font-semibold transition-all ${
              isRunning ? "bg-white/[0.05] text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            <Play size={11} />
            {isRunning ? "Running…" : "Run"}
          </button>

          {/* Interview controls */}
          {isInterviewer && interviewStatus === "waiting" && (
            <button onClick={handleStartInterview} className="flex items-center gap-1.5 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md font-semibold transition-all">
              <Play size={11} /> Start
            </button>
          )}
          {isInterviewer && interviewStatus === "in_progress" && (
            <button onClick={handleEndInterview} className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-md font-semibold transition-all">
              <Square size={11} /> End
            </button>
          )}
          {isInterviewer && interviewStatus === "completed" && (
            <button onClick={() => router.push(`/room/${roomId}/playback`)} className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-md font-semibold transition-all">
              <SkipForward size={11} /> Playback
            </button>
          )}

          {/* Delete */}
          {isInterviewer && room?.interview && (
            <button
              onClick={handleDeleteInterview}
              disabled={deleting}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all disabled:opacity-40"
              title="Delete interview"
            >
              <Trash2 size={11} />
              <span className="hidden sm:inline">{deleting ? "…" : "Delete"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main body ── */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">

        {/* Problem panel — resizable */}
        {showProblem && room.problem && (
          <>
            <div style={{ width: problemWidth, minWidth: 220, maxWidth: 600 }} className="flex-shrink-0 overflow-hidden border-r border-white/[0.05]">
              <ProblemPanel problem={room.problem} />
            </div>
            <ResizeDivider onDrag={handleProblemResize} />
          </>
        )}

        {/* Editor + Output */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className={showOutput ? "flex-1 overflow-hidden" : "h-full overflow-hidden"}>
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              code={code}
              onCodeChange={handleCodeChange}
            />
          </div>
          {showOutput && (
            <div className="h-44 flex-shrink-0 border-t border-white/[0.05] overflow-hidden">
              {room?.problem?.testCases ? (
                <TestCaseRunner testCases={room.problem.testCases} code={code} language={language} />
              ) : (
                <OutputPanel output={output} isRunning={isRunning} />
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-64 xl:w-72 flex-shrink-0 flex flex-col border-l border-white/[0.05] bg-[#0f0f17]">
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.05] flex-shrink-0">
            {rightTabs.map((tab) => {
              const meta = TAB_META[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-all relative ${
                    rightTab === tab ? "text-white border-b-2 border-violet-500 bg-white/[0.03]" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <meta.icon size={12} />
                  <span className="hidden sm:inline">{meta.label}</span>
                  {meta.badge > 0 && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center">
                      {meta.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Chat — always rendered so messages are never lost */}
            <div className={`flex-1 min-h-0 overflow-hidden ${
              rightTab === "chat" ? "flex flex-col" : "hidden"
            }`}>
              <ChatPanel messages={messages} onSendMessage={sendMessage} userName={session.userName} />
            </div>

            {rightTab === "notes" && isInterviewer && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <NotesPanel roomId={roomId} />
              </div>
            )}
            {rightTab === "security" && isInterviewer && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <SecurityPanel violations={violations} />
              </div>
            )}

            {/* Video tab: video on top, chat below — VideoPanel stays mounted
                so the camera stream is never torn down when switching tabs */}
            <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
              rightTab === "video" ? "" : "hidden"
            }`}>
              {/* Video — fixed height */}
              <div className="flex-shrink-0 p-2 border-b border-white/[0.05]">
                <VideoPanel
                  sharePeerId={sharePeerId}
                  onPeerIdReceived={onPeerIdReceived}
                />
              </div>
              {/* Chat below video — fills remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <ChatPanel messages={messages} onSendMessage={sendMessage} userName={session.userName} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
