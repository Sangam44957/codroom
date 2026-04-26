"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG, buildInitialFiles } from "@/components/editor/CodeEditor";
import OutputPanel from "@/components/editor/OutputPanel";
import ProblemPanel from "@/components/editor/ProblemPanel";
import TestCaseRunner from "@/components/editor/TestCaseRunner";
import ChatPanel from "@/components/ui/ChatPanel";
import NotesPanel from "@/components/ui/NotesPanel";
import SecurityWarning from "@/components/ui/SecurityWarning";
import VideoPanel from "@/components/video/VideoPanel";
import Whiteboard from "@/components/whiteboard/Whiteboard";
import useSocket from "@/hooks/useSocket";
import useSecurityMonitor from "@/hooks/useSecurityMonitor";
import { useRoomShortcuts, ShortcutHelpModal } from "@/components/room/RoomShortcuts";
import { toast } from "sonner";
import {
  Play, Square, SkipForward, Wifi, WifiOff, Clock, X,
  MessageSquare, StickyNote, Video, Shield, ChevronLeft,
  ChevronRight, GripVertical, Trash2, LayoutPanelLeft, Lock, Unlock,
  PenLine, Link2, Maximize2, Minimize2,
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
  const [files, setFiles] = useState(() => buildInitialFiles("javascript"));
  const [activeFile, setActiveFile] = useState(() => Object.keys(buildInitialFiles("javascript"))[0]);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showProblem, setShowProblem] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [rightTab, setRightTab] = useState("chat");
  const [deleting, setDeleting] = useState(false);
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Resizable problem panel width (px)
  const [problemWidth, setProblemWidth] = useState(320);
  const containerRef = useRef(null);
  const editorFocusRef = useRef(null); // set by CodeEditor via onEditorMount

  const [session, setSession] = useState({ userName: "", role: "candidate", joined: false });
  const [authToken, setAuthToken] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("waiting");
  // countdown timer — null means no timer active
  const [timerEndsAt, setTimerEndsAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  const elapsedRef = useRef(null);

  // Drive security monitor from focus mode, not interview status
  const { violations, warningCount, isLocked, unlock, requestFullscreen } = useSecurityMonitor(
    focusMode && session.role === "candidate",
    // Violations go to security panel only — no chat spam
    null,
    (count) => {
      // Only notify about lock, don't auto-end interview
      sendMessage(`🔒 Session locked after ${count} security violations. Interviewer can unlock or end interview.`);
    }
  );

  const [remoteCursors, setRemoteCursors] = useState([]);

  const {
    isConnected, serverStateLost, users, messages,
    emitCodeChange, emitLanguageChange, emitCodeOutput, emitTimelineEvent,
    sendMessage, sharePeerId, emitSetInterviewId, emitSetFocusMode,
    emitCameraToggle, emitMicToggle, emitUnlockCandidate,
    emitWhiteboardDraw, emitWhiteboardClear,
    emitCursorMove,
    emitTimerSet, emitTimerExtend, emitTimerClear, onTimerSync,
    onCodeUpdate, onLanguageUpdate, onOutputUpdate, onPeerIdReceived, onInterviewStarted,
    onFocusModeChanged, onWhiteboardDraw, onWhiteboardClear, onRemoteCameraToggle,
    onRemoteMicToggle, onCandidateUnlocked, onRemoteCursor,
  } = useSocket(session.joined ? roomId : null, session.userName, session.role, authToken);

  // Define all callbacks at the top level to avoid conditional hook calls
  const handleEscapeKey = useCallback((e) => {
    if (e.key === "Escape") {
      setEditorFullscreen(false);
      setBoardFullscreen(false);
    }
  }, []);

  const handleCursorChange = useCallback(
    (line, column) => emitCursorMove({ line, column }),
    [emitCursorMove],
  );

  const handleFileChange = useCallback(
    (filename, content) => {
      setFiles((prev) => {
        const next = { ...prev, [filename]: content };
        if (filename === activeFile) emitCodeChange(content);
        return next;
      });
    },
    [activeFile, emitCodeChange],
  );

  const handleFilesChange = useCallback((newFiles, newActive) => {
    setFiles(newFiles);
    setActiveFile(newActive);
  }, []);

  const handleLanguageChange = useCallback(
    (l) => {
      setLanguage(l);
      // Reset to a single template file for the new language
      const newFiles = buildInitialFiles(l);
      setFiles(newFiles);
      setActiveFile(Object.keys(newFiles)[0]);
      emitLanguageChange(l);
    }, [emitLanguageChange],
  );

  const handleRunCode = useCallback(async function() {
    const activeCode = files[activeFile] ?? "";
    if (isRunning || !activeCode.trim()) {
      if (!activeCode.trim()) setOutput({ status: "error", output: "No code to run", type: "Error" });
      return;
    }
    setIsRunning(true); setOutput(null); setShowOutput(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeCode, language }),
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
  }, [files, activeFile, isRunning, language, emitCodeOutput, emitTimelineEvent]);

  const fetchRoom = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const rawToken = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("joinToken") : null;

      if (rawToken) {
        const exchangeRes = await fetch(`/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ joinToken: rawToken }),
          signal: controller.signal,
        });
        if (!exchangeRes.ok) {
          const d = await exchangeRes.json().catch(() => ({}));
          setError(d.error || "Invalid invite link");
          setLoading(false);
          return;
        }
        const joinData = await exchangeRes.json();
        // If the room has a pre-set candidate name, lock it in immediately
        if (joinData.candidateName) {
          setSession({ userName: joinData.candidateName, role: "candidate", joined: true });
        }
        window.history.replaceState({}, "", `/room/${roomId}`);
      }

      const res = await fetch(`/api/rooms/${roomId}`, { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Room not found"); return; }

      setRoom(data.room);
      const lang = data.room.language || "javascript";
      setLanguage(lang);

      // Use problems array if available, fall back to legacy single problem
      const allProblems = data.room.problems?.length
        ? data.room.problems.map((rp) => rp.problem)
        : data.room.problem ? [data.room.problem] : [];
      const firstProblem = allProblems[0] || null;
      const initialFiles = buildInitialFiles(lang, firstProblem?.starterCode);
      setFiles(initialFiles);
      setActiveFile(Object.keys(initialFiles)[0]);
      setShowProblem(allProblems.length > 0);

      if (data.room.interview) {
        setInterviewId(data.room.interview.id);
        setInterviewStatus(data.room.interview.status);
      }

      try {
        const meRes = await fetch("/api/auth/me", { signal: controller.signal });
        if (meRes.ok) {
          const meData = await meRes.json();
          const myId = meData.user?.userId ?? meData.user?.id;
          if (myId && myId === data.room.createdById) {
            setSession({ userName: meData.user.name, role: "interviewer", joined: true });
            fetch("/api/auth/socket-token")
              .then((r) => r.json())
              .then((d) => { if (d.token) setAuthToken(d.token); })
              .catch(() => {});
          }
        }
      } catch {}
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out");
        setError("Request timed out");
      } else {
        setError("Failed to load room");
      }
    } finally { 
      clearTimeout(timeoutId);
      setLoading(false); 
    }
  }, [roomId]);

  // When server state is lost (restart), push active file back so the room
  // re-seeds correctly for any new participants joining.
  useEffect(() => {
    const activeCode = files[activeFile] ?? "";
    if (serverStateLost && activeCode.trim()) {
      emitCodeChange(activeCode);
    }
  }, [serverStateLost, files, activeFile, emitCodeChange]);

  useEffect(() => {
    onFocusModeChanged((enabled) => setFocusMode(enabled));
  }, [onFocusModeChanged]);

  // When interviewer unlocks, reset candidate lock state and re-enter fullscreen
  useEffect(() => {
    onCandidateUnlocked(() => {
      unlock();
      // Re-enter fullscreen if focus mode is still active
      if (document.fullscreenElement === null) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    });
  }, [onCandidateUnlocked, unlock]);

  useEffect(() => {
    onCodeUpdate((remoteCode) => {
      setFiles((prev) => ({ ...prev, [activeFile]: remoteCode }));
    });
    onLanguageUpdate((l) => setLanguage(l));
    onOutputUpdate((o) => setOutput(o));
    onInterviewStarted((id) => {
      setInterviewId(id);
      setInterviewStatus((prev) => (prev === "waiting" ? "in_progress" : prev));
    });
  }, [onCodeUpdate, onLanguageUpdate, onOutputUpdate, onInterviewStarted, activeFile]);

  useEffect(() => {
    onRemoteCursor(({ cursor, userId, userName, role }) => {
      setRemoteCursors((prev) => {
        const idx = prev.findIndex((c) => c.userId === userId);
        const entry = { userId, userName, role, cursor };
        if (idx === -1) return [...prev, entry];
        const next = [...prev];
        next[idx] = entry;
        return next;
      });
    });
  }, [onRemoteCursor]);

  // Remove cursor when user leaves
  useEffect(() => {
    const activeUserIds = new Set(users.map((u) => u.id));
    setRemoteCursors((prev) => prev.filter((c) => activeUserIds.has(c.userId)));
  }, [users]);

  // Enter fullscreen when focus mode activates, exit when it deactivates
  useEffect(() => {
    if (focusMode && session.role === "candidate") {
      requestFullscreen();
    } else if (!focusMode && session.role === "candidate") {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [focusMode, session.role, requestFullscreen]);


  // Sync timer from socket — register via ref pattern to avoid setState-in-effect lint error
  const setTimerEndsAtRef = useRef(setTimerEndsAt);
  setTimerEndsAtRef.current = setTimerEndsAt;
  useEffect(() => {
    onTimerSync(({ endsAt }) => setTimerEndsAtRef.current(endsAt));
  }, [onTimerSync]);

  // Countdown tick
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerEndsAt) { setSecondsLeft(null); return; }
    function tick() {
      const diff = Math.max(0, Math.round((new Date(timerEndsAt) - Date.now()) / 1000));
      setSecondsLeft(diff);
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerEndsAt]);

  // Elapsed count-up (only when in_progress, as fallback display when no countdown)
  useEffect(() => {
    clearInterval(elapsedRef.current);
    if (interviewStatus === "in_progress") {
      elapsedRef.current = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    }
    return () => clearInterval(elapsedRef.current);
  }, [interviewStatus]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  function formatCountdown(s) {
    if (s === null) return null;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function formatElapsed(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  async function handleStartInterview() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, language }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewId(data.interview.id);
        setInterviewStatus("in_progress");
        emitSetInterviewId(data.interview.id);
        toast.success("Interview started!");
      } else toast.error(data.error || "Failed to start interview");
    } catch (err) { 
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      } else {
        console.error(err); 
        toast.error("Failed to start interview"); 
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function handleEndInterview() {
    if (!confirm("End this interview?")) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const res = await fetch(`/api/interviews/${interviewId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCode: files[activeFile] ?? "", language }),
        signal: controller.signal,
      });
      if (res.ok) {
        setInterviewStatus("completed");
        toast.success("Interview ended successfully");
        // Don't auto-generate report or redirect - let interviewer choose
      } else { 
        const d = await res.json(); 
        toast.error(d.error || "Failed to end interview"); 
      }
    } catch (err) { 
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      } else {
        console.error(err); 
        toast.error("Failed to end interview"); 
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function handleDeleteInterview() {
    const id = interviewId || room?.interview?.id;
    if (!id) return;
    if (!confirm("Delete this interview? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Interview deleted"); router.push("/dashboard"); }
      else toast.error("Delete failed.");
    } finally { setDeleting(false); }
  }

  // Keyboard shortcuts
  const { showShortcutModal, setShowShortcutModal } = useRoomShortcuts({
    onRunCode: handleRunCode,
    onRunTests: () => {},
    onToggleChat: () => setRightTab((t) => t === "chat" ? "video" : "chat"),
    onToggleWhiteboard: () => setRightTab((t) => t === "board" ? "chat" : "board"),
    onFocusEditor: () => editorFocusRef.current?.(),
    onResetLayout: () => { setShowProblem(true); setShowOutput(true); setProblemWidth(320); },
  });

  function handleJoin(e) {
    e.preventDefault();
    const name = e.target.elements.name?.value?.trim() || session.userName;
    if (name) setSession({ userName: name, role: "candidate", joined: true });
  }

  async function copyInviteLink() {
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin;
    const url = `${base}/room/${roomId}?joinToken=${room.joinToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied!");
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch { window.prompt("Copy invite link:", url); }
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
            {(room.problems?.length > 0 || room.problem) && (
              <p className="text-violet-400 text-sm">
                {room.problems?.length > 1
                  ? `${room.problems.length} problems`
                  : `Problem: ${room.problems?.[0]?.problem?.title || room.problem?.title}`}
              </p>
            )}
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7">
            <p className="text-slate-500 text-sm mb-5 text-center">Enter your name to join the interview</p>
            <form onSubmit={handleJoin}>
              {session.userName ? (
                <div className="w-full px-4 py-3 bg-white/[0.04] border border-violet-500/30 rounded-xl text-violet-300 font-medium mb-4 text-center">
                  Joining as <span className="font-bold">{session.userName}</span>
                </div>
              ) : (
                <input
                  name="name" type="text" placeholder="Your name"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 mb-4 transition-all"
                  autoFocus
                />
              )}
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
  const rightTabs = ["chat", ...(isInterviewer ? ["notes"] : []), "video", "board"];

  const TAB_META = {
    chat:  { icon: MessageSquare, label: "Chat" },
    notes: { icon: StickyNote,    label: "Notes" },
    video: { icon: Video,         label: "Video" },
    board: { icon: PenLine,       label: "Board" },
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d14] overflow-hidden text-slate-200" onKeyDown={handleEscapeKey}>

      {(warningCount > 0 || isLocked) && (
        <SecurityWarning
          warningCount={warningCount}
          isLocked={isLocked}
          onDismiss={() => {}}
        />
      )}

      {/* ── Top bar ── */}
      <div className={`flex items-center justify-between px-4 h-11 bg-[#111118] border-b border-white/[0.06] flex-shrink-0 gap-3 ${editorFullscreen ? "hidden" : ""}`}>
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <a href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0 text-sm font-bold">
            <LayoutPanelLeft size={15} />
            <span className="hidden sm:inline">CodRoom</span>
          </a>
          <span className="text-white/10">|</span>
          <span className="text-slate-400 text-sm truncate max-w-[140px] sm:max-w-[220px]">{room.title}</span>
          {room.problems?.length > 0 && (
            <span className="hidden md:inline text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full truncate max-w-[140px]">
              {room.problems.length > 1 ? `${room.problems.length} problems` : room.problems[0]?.problem?.title}
            </span>
          )}
        </div>

        {/* Center — timer + status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {interviewStatus === "in_progress" && secondsLeft !== null && (
            <span className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1 rounded-lg border ${
              secondsLeft <= 60
                ? "text-rose-300 bg-rose-500/10 border-rose-500/30 animate-pulse"
                : secondsLeft <= 300
                ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                : "text-white bg-white/[0.06] border-white/[0.08]"
            }`}>
              <Clock size={11} className={secondsLeft <= 60 ? "text-rose-400" : secondsLeft <= 300 ? "text-amber-400" : "text-violet-400"} />
              {formatCountdown(secondsLeft)}
            </span>
          )}
          {interviewStatus === "in_progress" && secondsLeft === null && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-white bg-white/[0.06] border border-white/[0.08] px-3 py-1 rounded-lg">
              <Clock size={11} className="text-violet-400" />
              {formatElapsed(elapsedSeconds)}
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

          {/* Invite link — interviewer only */}
          {isInterviewer && room?.joinToken && (
            <button
              onClick={copyInviteLink}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all ${
                inviteCopied
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                  : "bg-white/[0.04] text-slate-400 hover:text-cyan-300 border-white/[0.08] hover:border-cyan-500/30 hover:bg-cyan-500/10"
              }`}
              title="Copy candidate invite link"
            >
              <Link2 size={10} />
              <span className="hidden sm:inline">{inviteCopied ? "Copied!" : "Invite"}</span>
            </button>
          )}

          {/* Connection */}
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
            isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}>
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            <span className="hidden sm:inline">{isConnected ? "Live" : "Off"}</span>
          </span>

          {/* Security violation count + unlock button — interviewer only */}
          {isInterviewer && violations.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20">
                <Shield size={10} />
                {violations.length}
              </span>
              {isLocked && (
                <button
                  onClick={() => { emitUnlockCandidate(); toast.success("Candidate unlocked"); }}
                  className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                  title="Unlock candidate"
                >
                  Unlock
                </button>
              )}
            </div>
          )}

          {serverStateLost && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">⚠ State lost</span>
          )}
        </div>
      </div>

      {/* ── Fullscreen floating bar — only visible when editor is fullscreen ── */}
      {editorFullscreen && (
        <div className="flex items-center justify-between px-4 h-9 bg-[#0f0f17]/90 backdrop-blur border-b border-white/[0.05] flex-shrink-0 gap-2">
          <span className="text-slate-500 text-xs">{room.title}</span>
          <div className="flex items-center gap-1.5">
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
            <button
              onClick={() => setEditorFullscreen(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-all"
              title="Exit fullscreen (Esc)"
            >
              <Minimize2 size={11} /> Exit
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className={`flex items-center justify-between px-4 h-9 bg-[#0f0f17] border-b border-white/[0.05] flex-shrink-0 gap-2 ${editorFullscreen ? "hidden" : ""}`}>
        <div className="flex items-center gap-1.5">
          {(room.problems?.length > 0 || room.problem) && (
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
          {/* Timer controls — interviewer only, during active interview */}
          {isInterviewer && interviewStatus === "in_progress" && (
            <div className="flex items-center gap-1">
              {secondsLeft === null && room?.template?.durationMinutes && (
                <button
                  onClick={() => emitTimerSet(room.template.durationMinutes)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all"
                  title="Start template timer"
                >
                  <Clock size={10} /> {room.template.durationMinutes}m
                </button>
              )}
              {[10, 15, 30].map((m) => (
                <button key={m}
                  onClick={() => emitTimerExtend(m)}
                  className="px-2 py-1 text-xs rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all"
                  title={`Add ${m} minutes`}
                >+{m}m</button>
              ))}
              {secondsLeft !== null && (
                <button
                  onClick={() => emitTimerClear()}
                  className="px-2 py-1 text-xs rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Remove timer"
                ><X size={10} /></button>
              )}
            </div>
          )}

          {/* Focus mode toggle — interviewer only, only during active interview */}
          {isInterviewer && interviewStatus === "in_progress" && (
            <button
              onClick={() => {
                const next = !focusMode;
                setFocusMode(next);
                emitSetFocusMode(next);
                toast(next ? "🔒 Focus mode ON — candidate is now monitored" : "🔓 Focus mode OFF — candidate can browse freely");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-semibold transition-all border ${
                focusMode
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.16]"
              }`}
              title={focusMode ? "Disable focus mode" : "Enable focus mode"}
            >
              {focusMode ? <Lock size={11} /> : <Unlock size={11} />}
              Focus
            </button>
          )}

          {/* Candidate focus mode indicator */}
          {!isInterviewer && focusMode && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Lock size={10} /> Focus Mode
            </span>
          )}

          {/* Editor fullscreen */}
          <button
            onClick={() => setEditorFullscreen((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            title={editorFullscreen ? "Exit fullscreen" : "Fullscreen editor"}
          >
            {editorFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>

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
          {/* Generate Report button — only show after interview is completed */}
          {isInterviewer && interviewStatus === "completed" && (
            <button 
              onClick={async () => {
                toast.loading("Generating AI report...");
                try {
                  await fetch(`/api/interviews/${interviewId}/report`, { method: "POST" });
                  toast.success("Report generated!");
                  router.push(`/room/${roomId}/report`);
                } catch {
                  toast.error("Failed to generate report");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md font-semibold transition-all"
            >
              📊 Report
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

        {/* Problem panel — resizable with tabs for multiple problems */}
        {!editorFullscreen && showProblem && (() => {
          const allProblems = room.problems?.length
            ? room.problems.map((rp) => rp.problem)
            : room.problem ? [room.problem] : [];
          const activeProblem = allProblems[activeProblemIdx] || allProblems[0];
          if (!activeProblem) return null;
          return (
            <>
              <div style={{ width: problemWidth, minWidth: 220, maxWidth: 600 }} className="flex-shrink-0 overflow-hidden border-r border-white/[0.05] flex flex-col">
                {/* Problem tabs — only show if more than one */}
                {allProblems.length > 1 && (
                  <div className="flex border-b border-white/[0.05] flex-shrink-0 overflow-x-auto">
                    {allProblems.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => setActiveProblemIdx(i)}
                        className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                          activeProblemIdx === i
                            ? "text-white border-violet-500 bg-white/[0.03]"
                            : "text-slate-600 border-transparent hover:text-slate-400"
                        }`}
                      >
                        Q{i + 1}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <ProblemPanel problem={activeProblem} isCandidate={!isInterviewer} />
                </div>
              </div>
              <ResizeDivider onDrag={handleProblemResize} />
            </>
          );
        })()}

        {/* Editor + Output */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className={showOutput ? "flex-1 overflow-hidden" : "h-full overflow-hidden"}>
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              files={files}
              activeFile={activeFile}
              onActiveFileChange={setActiveFile}
              onFileChange={handleFileChange}
              onFilesChange={handleFilesChange}
              onCursorChange={handleCursorChange}
              remoteCursors={remoteCursors}
              onRunCode={handleRunCode}
              onEditorMount={(focusFn) => { editorFocusRef.current = focusFn; }}
            />
          </div>
          {showOutput && (
            <div className="h-44 flex-shrink-0 border-t border-white/[0.05] overflow-hidden">
              {(() => {
                const allProblems = room.problems?.length
                  ? room.problems.map((rp) => rp.problem)
                  : room.problem ? [room.problem] : [];
                const activeProblem = allProblems[activeProblemIdx] || allProblems[0];
                return activeProblem?.testCases ? (
                  <TestCaseRunner
                    testCases={activeProblem.testCases}
                    code={files[activeFile] ?? ""}
                    language={language}
                    roomId={roomId}
                    problemIndex={activeProblemIdx}
                  />
                ) : (
                  <OutputPanel output={output} isRunning={isRunning} />
                );
              })()}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className={`w-64 xl:w-72 flex-shrink-0 flex flex-col border-l border-white/[0.05] bg-[#0f0f17] ${editorFullscreen ? "hidden" : ""}`}>
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
                  emitCameraToggle={emitCameraToggle}
                  onRemoteCameraToggle={onRemoteCameraToggle}
                  emitMicToggle={emitMicToggle}
                  onRemoteMicToggle={onRemoteMicToggle}
                />
              </div>
              {/* Chat below video — fills remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <ChatPanel messages={messages} onSendMessage={sendMessage} userName={session.userName} />
              </div>
            </div>

            {/* Whiteboard — stays mounted to preserve canvas state */}
            {!boardFullscreen && (
            <div className={`flex-1 min-h-0 overflow-hidden ${
              rightTab === "board" ? "flex flex-col" : "invisible pointer-events-none absolute"
            }`}>
              <Whiteboard
                onDraw={emitWhiteboardDraw}
                onClear={emitWhiteboardClear}
                onRemoteDraw={onWhiteboardDraw}
                onRemoteClear={onWhiteboardClear}
                onToggleFullscreen={() => setBoardFullscreen((v) => !v)}
                isFullscreen={boardFullscreen}
              />
            </div>
            )}

            {/* Whiteboard fullscreen overlay */}
            {boardFullscreen && (
              <div className="fixed inset-0 z-50 bg-[#0d0d14] flex flex-col">
                <Whiteboard
                  onDraw={emitWhiteboardDraw}
                  onClear={emitWhiteboardClear}
                  onRemoteDraw={onWhiteboardDraw}
                  onRemoteClear={onWhiteboardClear}
                  onToggleFullscreen={() => setBoardFullscreen(false)}
                  isFullscreen={boardFullscreen}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ShortcutHelpModal open={showShortcutModal} onClose={() => setShowShortcutModal(false)} />
    </div>
  );
}
