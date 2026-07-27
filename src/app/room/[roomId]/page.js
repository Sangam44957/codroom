"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor, { LANGUAGE_CONFIG, buildInitialFiles } from "@/components/editor/CodeEditor";
import OutputPanel from "@/components/editor/OutputPanel";
import ProblemPanel from "@/components/editor/ProblemPanel";
import ScratchPad from "@/components/editor/ScratchPad";
import TestCaseRunner from "@/components/editor/TestCaseRunner";
import ChatPanel from "@/components/ui/ChatPanel";
import NotesPanel from "@/components/ui/NotesPanel";
import InterviewTimeline from "@/components/ui/InterviewTimeline";
import SecurityWarning from "@/components/ui/SecurityWarning";
import ConnectionQuality from "@/components/ui/ConnectionQuality";
import AIAssistant from "@/components/ui/AIAssistant";
import CollabIndicator from "@/components/editor/CollabIndicator";
import VideoPanel from "@/components/video/VideoPanel";
import VideoDebug from "@/components/debug/VideoDebug";
import Whiteboard from "@/components/whiteboard/Whiteboard";
import useSocket from "@/hooks/useSocket";
import useSecurityMonitor from "@/hooks/useSecurityMonitor";
import { useInterview } from "@/hooks/useInterview";
import { useTimer } from "@/hooks/useTimer";
import { useRoomLayout } from "@/hooks/useRoomLayout";
import { useRoomShortcuts, ShortcutHelpModal } from "@/components/room/RoomShortcuts";
import OnboardingTour, { useOnboardingTour } from "@/components/ui/OnboardingTour";
import { useNavigationGuard, useAutoSave, getAutoSave, clearAutoSave } from "@/hooks/useNavigationGuard";
import SystemCheck from "@/components/ui/SystemCheck";
import HintToast from "@/components/ui/HintToast";
import { useAdaptiveHints } from "@/hooks/useAdaptiveHints";
import { toast } from "sonner";
import {
  Play, Square, SkipForward, Wifi, WifiOff, Clock, X,
  MessageSquare, StickyNote, Video, Shield, ChevronLeft,
  ChevronRight, GripVertical, Trash2, LayoutPanelLeft, Lock, Unlock,
  PenLine, Link2, Maximize2, Minimize2, ListOrdered, Bot, Users,
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
  const [deleting, setDeleting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [collabMode, setCollabMode] = useState(false);
  const [aiChatDraft, setAiChatDraft] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [needsFullscreenConsent, setNeedsFullscreenConsent] = useState(false);
  const [localWarningCount, setLocalWarningCount] = useState(0);
  const localWarningCountRef = useRef(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [mobileTab, setMobileTab] = useState("editor");
  const editorFocusRef = useRef(null);

  const [session, setSession] = useState({ userName: "", role: "candidate", joined: false });
  const [authToken, setAuthToken] = useState(null);
  const [roomTicket, setRoomTicket] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState([]);

  // Custom hooks
  const {
    showProblem, setShowProblem, showScratchPad, setShowScratchPad,
    showOutput, setShowOutput, rightTab, setRightTab,
    activeProblemIdx, setActiveProblemIdx, editorFullscreen, setEditorFullscreen,
    boardFullscreen, setBoardFullscreen, problemWidth, containerRef,
    handleProblemResize, resetLayout
  } = useRoomLayout();

  const {
    isConnected, serverStateLost, users, messages, timelineEvents,
    emitCodeChange, emitLanguageChange, emitCodeOutput, emitTimelineEvent,
    sendMessage, sharePeerId, emitSetInterviewId, emitSetFocusMode, emitSetCollabMode,
    emitCameraToggle, emitMicToggle, emitUnlockCandidate,
    emitWhiteboardDraw, emitWhiteboardClear,
    emitCursorMove,
    emitEmojiReaction,
    onEmojiReaction,
    latency,
    reconnectCount,
    forceReconnect,
    emitTimerSet, emitTimerExtend, emitTimerClear, onTimerSync,
    onCodeUpdate, onLanguageUpdate, onOutputUpdate, onPeerIdReceived, onInterviewStarted,
    onFocusModeChanged, onCollabModeChanged, onWhiteboardDraw, onWhiteboardClear, onRemoteCameraToggle,
    onRemoteMicToggle, onCandidateUnlocked, onRemoteCursor,
  } = useSocket(session.joined ? roomId : null, session.userName, session.role, authToken, session.roomTicket || roomTicket);

  const {
    interviewId, interviewStatus, setInterviewId, setInterviewStatus,
    handleStartInterview, handleEndInterview
  } = useInterview(roomId, session, emitSetInterviewId);

  const { secondsLeft, elapsedSeconds, formatCountdown, formatElapsed } = useTimer(
    onTimerSync, interviewStatus
  );

  // Drive security monitor from focus mode, not interview status
  const { violations, warningCount, isLocked, unlock, requestFullscreen } = useSecurityMonitor(
    focusMode && session.role === "candidate",
    // Send detailed violation info to interviewer via chat
    useCallback((violation) => {
      const violationMessages = {
        tab_switch: "🚨 Candidate switched to another tab",
        window_blur: "⚠️ Candidate clicked outside browser window", 
        fullscreen_exit: "📱 Candidate exited fullscreen mode",
        paste_detected: "📋 Candidate pasted content outside editor",
        alt_tab: "⌨️ Candidate pressed Alt+Tab",
        devtools: "🔧 Candidate tried to open DevTools",
        copy_detected: "📄 Candidate copied substantial content",
        right_click: "🖱️ Candidate used right-click menu",
        external_script: "🛡️ Blocked external script injection"
      };
      const message = violationMessages[violation.type] || `🚨 Security violation: ${violation.type}`;
      localWarningCountRef.current += 1;
      sendMessage(`${message} (Warning #${localWarningCountRef.current})`);
      setLocalWarningCount(localWarningCountRef.current);
    }, [sendMessage]),
    useCallback((count) => {
      sendMessage(`🔒 Session locked after ${count} security violations. Click "Unlock" to restore access.`);
    }, [sendMessage])
  );

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
      // Check for existing session first
      const sessionRes = await fetch(`/api/rooms/${roomId}/session`, {
        signal: controller.signal,
      });
      
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.hasSession) {
          setRoomTicket(sessionData.roomTicket);
          if (sessionData.candidateName) {
            setSession({ 
              userName: sessionData.candidateName, 
              role: "candidate", 
              joined: true,
              roomTicket: sessionData.roomTicket
            });
          }
        }
      }

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
        // Store the room ticket for Socket.IO authentication
        if (joinData.roomTicket) {
          setRoomTicket(joinData.roomTicket);
        }
        // If the room has a pre-set candidate name, lock it in immediately
        if (joinData.candidateName) {
          setSession({ 
            userName: joinData.candidateName, 
            role: "candidate", 
            joined: true,
            roomTicket: joinData.roomTicket // Store ticket in session too
          });
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
    if (serverStateLost) {
      const activeCode = files[activeFile] ?? "";
      if (activeCode.trim()) emitCodeChange(activeCode);
    }
  }, [serverStateLost]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    onFocusModeChanged((enabled) => { if (active) setFocusMode(enabled); });
    return () => { active = false; };
  }, [onFocusModeChanged]);

  useEffect(() => {
    let active = true;
    onCollabModeChanged((enabled) => { if (active) setCollabMode(enabled); });
    return () => { active = false; };
  }, [onCollabModeChanged]);

  // When interviewer unlocks, reset candidate lock state and show consent gate
  useEffect(() => {
    let active = true;
    onCandidateUnlocked(() => {
      if (!active) return;
      unlock();
      if (focusMode && !document.fullscreenElement) {
        setNeedsFullscreenConsent(true);
      }
    });
    return () => { active = false; };
  }, [onCandidateUnlocked, unlock, focusMode]);

  useEffect(() => {
    let active = true;
    onCodeUpdate((remoteCode) => {
      if (active) setFiles((prev) => ({ ...prev, [activeFile]: remoteCode }));
    });
    onLanguageUpdate((l) => { if (active) setLanguage(l); });
    onOutputUpdate((o) => { if (active) setOutput(o); });
    onInterviewStarted((id) => {
      if (!active) return;
      setInterviewId(id);
      setInterviewStatus((prev) => {
        if (prev === "waiting") {
          emitTimelineEvent({ type: "interview_started", label: "Interview Started", timestamp: new Date().toISOString() });
          return "in_progress";
        }
        return prev;
      });
    });
    return () => { active = false; };
  }, [onCodeUpdate, onLanguageUpdate, onOutputUpdate, onInterviewStarted, activeFile]);

  useEffect(() => {
    let active = true;
    onRemoteCursor(({ cursor, userId, userName, role }) => {
      if (!active) return;
      setRemoteCursors((prev) => {
        const idx = prev.findIndex((c) => c.userId === userId);
        const entry = { userId, userName, role, cursor };
        if (idx === -1) return [...prev, entry];
        const next = [...prev];
        next[idx] = entry;
        return next;
      });
    });
    return () => { active = false; };
  }, [onRemoteCursor]);

  // Remove cursor when user leaves
  useEffect(() => {
    const activeUserIds = new Set(users.map((u) => u.id));
    setRemoteCursors((prev) => prev.filter((c) => activeUserIds.has(c.userId)));
  }, [users]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

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

  // Onboarding tour
  const { showTour, completeTour } = useOnboardingTour(session.role);

  // Navigation guard — warn on browser close/refresh during active interview
  const isInterviewActive = interviewStatus === "in_progress";
  useNavigationGuard(isInterviewActive);
  useAutoSave(roomId, files[activeFile] ?? "", isInterviewActive);

  // Restore auto-saved code on rejoin
  useEffect(() => {
    if (!session.joined || !roomId) return;
    const saved = getAutoSave(roomId);
    if (!saved?.code) return;
    const mins = Math.round((Date.now() - new Date(saved.savedAt)) / 60000);
    toast(
      `Restore auto-saved code from ${mins}m ago?`,
      {
        action: {
          label: "Restore",
          onClick: () => {
            setFiles((prev) => ({ ...prev, [activeFile]: saved.code }));
            clearAutoSave(roomId);
          },
        },
        cancel: { label: "Dismiss", onClick: () => clearAutoSave(roomId) },
        duration: 12000,
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.joined]);

  // Keyboard shortcuts
  const { showShortcutModal, setShowShortcutModal } = useRoomShortcuts({
    onRunCode: handleRunCode,
    onRunTests: () => {},
    onToggleChat: () => setRightTab((t) => t === "chat" ? "video" : "chat"),
    onToggleWhiteboard: () => setRightTab((t) => t === "board" ? "chat" : "board"),
    onFocusEditor: () => editorFocusRef.current?.(),
    onResetLayout: resetLayout,
  });

  // Adaptive hints — interviewer can toggle; candidate receives hints
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const { hint, dismissHint } = useAdaptiveHints({
    enabled: interviewStatus === "in_progress" && session.role === "candidate" && hintsEnabled,
    output,
    code: files[activeFile] ?? "",
    interviewStatus,
  });

  function handleJoin(e) {
    e.preventDefault();
    const name = e.target.elements.name?.value?.trim() || session.userName;
    if (name) {
      setSession({ 
        userName: name, 
        role: "candidate", 
        joined: true,
        roomTicket: roomTicket // Use the stored roomTicket
      });
    }
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
          <div className="mt-4">
            <SystemCheck />
          </div>
        </div>
      </div>
    );
  }

  const isInterviewer = session.role === "interviewer";
  const rightTabs = ["chat", ...(isInterviewer ? ["notes", "timeline", "ai"] : []), "video", "board"];

  const TAB_META = {
    chat:     { icon: MessageSquare, label: "Chat" },
    notes:    { icon: StickyNote,    label: "Notes" },
    timeline: { icon: ListOrdered,   label: "Timeline" },
    ai:       { icon: Bot,           label: "AI" },
    video:    { icon: Video,         label: "Video" },
    board:    { icon: PenLine,       label: "Board" },
  };

  // Mobile bottom tab state — controls which panel is visible on small screens
  const mobileTabs = ["editor", "chat", "board"];
  const MOBILE_TAB_META = {
    editor: { icon: Play,          label: "Code" },
    chat:   { icon: MessageSquare, label: "Chat" },
    board:  { icon: PenLine,       label: "Board" },
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d14] overflow-hidden text-slate-200" onKeyDown={handleEscapeKey}>

      {needsFullscreenConsent && session.role === "candidate" && (
        <div className="fixed inset-0 z-[9998] bg-[#04040f]/95 backdrop-blur-md flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Lock size={28} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Focus Mode Enabled</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Your interviewer has enabled focus mode. Click below to enter fullscreen.
              Tab switching and copy/paste will be monitored.
            </p>
            <button
              onClick={async () => {
                await requestFullscreen();
                setNeedsFullscreenConsent(false);
              }}
              className="px-8 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all"
            >
              Enter Focus Mode
            </button>
          </div>
        </div>
      )}

      {(localWarningCount > 0 || isLocked) && (
        <SecurityWarning
          warningCount={localWarningCount}
          isLocked={isLocked}
          onDismiss={() => setLocalWarningCount(0)}
        />
      )}

      {/* ── Top bar ── */}
      <div className={`flex items-center justify-between px-4 h-11 bg-[#111118] border-b border-white/[0.06] flex-shrink-0 gap-3 ${editorFullscreen ? "hidden" : ""}`}>
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {interviewStatus === "in_progress" ? (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0 text-sm font-bold"
            >
              <LayoutPanelLeft size={15} />
              <span className="hidden sm:inline">CodRoom</span>
            </button>
          ) : (
            <a href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0 text-sm font-bold">
              <LayoutPanelLeft size={15} />
              <span className="hidden sm:inline">CodRoom</span>
            </a>
          )}
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
          {isInterviewer ? (
            <ConnectionQuality
              latency={latency}
              reconnectCount={reconnectCount}
              isConnected={isConnected}
              onForceReconnect={forceReconnect}
            />
          ) : (
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
              isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              <span className="hidden sm:inline">{isConnected ? "Live" : "Off"}</span>
            </span>
          )}

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
          {/* Interviewer-only: Toggle between Problem and Scratch Pad */}
          {isInterviewer && (
            <button
              onClick={() => {
                setShowScratchPad(!showScratchPad);
                if (!showScratchPad) {
                  setShowProblem(false); // Hide problem when showing scratch pad
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all ${
                showScratchPad ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
              }`}
              title="Toggle Scratch Pad for notes and testing"
            >
              <PenLine size={12} />
              Scratch
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
              onClick={async () => {
                const next = !focusMode;
                try {
                  await emitSetFocusMode(next);
                  setFocusMode(next);
                  toast(next ? "🔒 Focus mode ON — candidate is now monitored" : "🔓 Focus mode OFF — candidate can browse freely");
                } catch (err) {
                  toast.error(`Failed to toggle focus mode: ${err.message}`);
                }
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

          {/* Hints toggle — interviewer only, during active interview */}
          {isInterviewer && interviewStatus === "in_progress" && (
            <button
              onClick={() => {
                const next = !hintsEnabled;
                setHintsEnabled(next);
                toast(next ? "💡 Adaptive hints ON — candidate may receive hints" : "💡 Adaptive hints OFF");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-semibold transition-all border ${
                hintsEnabled
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.16]"
              }`}
              title={hintsEnabled ? "Disable adaptive hints" : "Enable adaptive hints for candidate"}
            >
              💡 Hints
            </button>
          )}

          {/* Collab mode toggle — interviewer only, during active interview */}
          {isInterviewer && interviewStatus === "in_progress" && (
            <button
              onClick={async () => {
                const next = !collabMode;
                try {
                  await emitSetCollabMode(next);
                  setCollabMode(next);
                  toast(next ? "👥 Collab mode ON — you can now co-edit" : "👥 Collab mode OFF");
                } catch (err) {
                  toast.error(`Failed to toggle collab mode: ${err.message}`);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-semibold transition-all border ${
                collabMode
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.16]"
              }`}
              title={collabMode ? "Disable collaborative editing" : "Enable collaborative editing"}
            >
              <Users size={11} />
              Collab
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
            <button onClick={() => handleStartInterview(language)} className="flex items-center gap-1.5 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-md font-semibold transition-all">
              <Play size={11} /> Start
            </button>
          )}
          {isInterviewer && interviewStatus === "in_progress" && (
            <button onClick={() => handleEndInterview(files, activeFile, language)} className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-md font-semibold transition-all">
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

        {/* Problem panel OR Scratch Pad — resizable — hidden on mobile */}
        {!editorFullscreen && (showProblem || showScratchPad) && (() => {
          if (showScratchPad && isInterviewer) {
            return (
              <>
                <div style={{ width: problemWidth, minWidth: 220, maxWidth: 600 }} className="hidden md:flex flex-shrink-0 overflow-hidden border-r border-white/[0.05] flex-col">
                  <ScratchPad language={language} roomId={roomId} />
                </div>
                <ResizeDivider onDrag={handleProblemResize} />
              </>
            );
          }
          
          const allProblems = room.problems?.length
            ? room.problems.map((rp) => rp.problem)
            : room.problem ? [room.problem] : [];
          const activeProblem = allProblems[activeProblemIdx] || allProblems[0];
          if (!activeProblem) return null;
          return (
            <>
              <div style={{ width: problemWidth, minWidth: 220, maxWidth: 600 }} className="hidden md:flex flex-shrink-0 overflow-hidden border-r border-white/[0.05] flex-col">
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

        {/* Editor + Output — hidden on mobile when another tab is active */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden editor-panel-primary ${
          mobileTab !== "editor" ? "hidden md:flex" : "flex"
        }`}>
          <CollabIndicator collabMode={collabMode} />
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
                    output={output}
                    isRunning={isRunning}
                  />
                ) : (
                  <OutputPanel output={output} isRunning={isRunning} />
                );
              })()}
            </div>
          )}
        </div>

        {/* Right panel — hidden on mobile when editor tab is active */}
        <div className={`flex-shrink-0 flex flex-col border-l border-white/[0.05] bg-[#0f0f17] panel-secondary ${
          editorFullscreen ? "hidden" : ""
        } ${
          mobileTab === "editor" ? "hidden md:flex md:w-64 xl:w-72" : "flex w-full md:w-64 xl:w-72"
        }`}>
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
              <ChatPanel
                messages={messages}
                onSendMessage={sendMessage}
                userName={session.userName}
                isCandidate={!isInterviewer}
                draft={aiChatDraft}
                onDraftConsumed={() => setAiChatDraft("")}
              />
            </div>

            {rightTab === "notes" && isInterviewer && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <NotesPanel roomId={roomId} />
              </div>
            )}

            {/* Timeline — interviewer only */}
            {rightTab === "timeline" && isInterviewer && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <InterviewTimeline events={timelineEvents} messages={messages} />
              </div>
            )}

            {/* AI Assistant — interviewer only */}
            {rightTab === "ai" && isInterviewer && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <AIAssistant
                  messages={messages}
                  onCopyToChat={(q) => setAiChatDraft(q)}
                />
              </div>
            )}

            {/* Video tab: video on top, chat below */}
            <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
              rightTab === "video" ? "" : "hidden"
            }`}>
              <div className="flex-shrink-0 p-2 border-b border-white/[0.05]">
                <VideoPanel
                  sharePeerId={sharePeerId}
                  onPeerIdReceived={onPeerIdReceived}
                  emitCameraToggle={emitCameraToggle}
                  onRemoteCameraToggle={onRemoteCameraToggle}
                  emitMicToggle={emitMicToggle}
                  onRemoteMicToggle={onRemoteMicToggle}
                  emitEmojiReaction={emitEmojiReaction}
                  onEmojiReaction={onEmojiReaction}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <ChatPanel
                  messages={messages}
                  onSendMessage={sendMessage}
                  userName={session.userName}
                  isCandidate={!isInterviewer}
                />
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

      {/* ── Mobile bottom tab bar ── */}
      <div className="md:hidden flex-shrink-0 flex border-t border-white/[0.06] bg-[#111118]">
        {mobileTabs.map((tab) => {
          const meta = MOBILE_TAB_META[tab];
          return (
            <button
              key={tab}
              onClick={() => {
                setMobileTab(tab);
                if (tab === "board") setRightTab("board");
                if (tab === "chat") setRightTab("chat");
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-all ${
                mobileTab === tab ? "text-violet-400" : "text-slate-600"
              }`}
            >
              <meta.icon size={18} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <ShortcutHelpModal open={showShortcutModal} onClose={() => setShowShortcutModal(false)} />
      {showTour && <OnboardingTour onComplete={completeTour} />}
      <HintToast hint={hint} onDismiss={dismissHint} />

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold text-lg mb-2">Leave interview?</h3>
            <p className="text-slate-400 text-sm mb-5">The interview is still in progress. Your progress will be auto-saved.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-all"
              >
                Stay
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug panel - remove in production
      {process.env.NODE_ENV === "development" && (
        <VideoDebug users={users} isConnected={isConnected} />
      )} */}
    </div>
  );
}
