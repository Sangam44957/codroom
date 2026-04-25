"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import {
  SkipBack, SkipForward, Play, Pause, ChevronLeft,
  ChevronRight, Clock, Film, Layers, List, BarChart2,
} from "lucide-react";

// ── Event / timeline-item metadata ───────────────────────────────────────────
const ITEM_META = {
  run_pass:        { color: "#22c55e", dot: "bg-emerald-500", label: "Run passed" },
  run_fail:        { color: "#ef4444", dot: "bg-rose-500",    label: "Run failed" },
  language_change: { color: "#a78bfa", dot: "bg-violet-400",  label: "Language" },
  note:            { color: "#f59e0b", dot: "bg-amber-400",   label: "Note" },
  code:            { color: "#64748b", dot: "bg-slate-500",   label: "Code" },
  default:         { color: "#f59e0b", dot: "bg-amber-400",   label: "Event" },
};

function itemMeta(type) { return ITEM_META[type] ?? ITEM_META.default; }

// ── Derive current code + language from unified timeline ──────────────────────
function deriveFrame(timeline, index, baseLanguage) {
  let code = "";
  let language = baseLanguage;
  for (let i = 0; i <= index; i++) {
    const item = timeline[i];
    if (item.type === "code") code = item.data.code;
    if (item.type === "language_change") language = item.data.label;
  }
  return { code, language };
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDuration(s) {
  if (!s) return "0m";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatMs(ms) {
  const m = Math.floor(ms / 60_000);
  return m > 0 ? `~${m}m` : "<1m";
}

export default function PlaybackPage() {
  const { roomId } = useParams();
  const router = useRouter();

  const [data, setData]           = useState(null); // full playback payload
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed]         = useState(1);
  const [showEvents, setShowEvents] = useState(true);
  const [showStats, setShowStats] = useState(false);

  const timeoutRef   = useRef(null);
  const eventListRef = useRef(null);

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Step 1: get room to find interviewId
      const roomRes  = await fetch(`/api/rooms/${roomId}`, { signal: controller.signal });
      const roomData = await roomRes.json();
      if (!roomRes.ok) {
        setError(roomRes.status === 403
          ? "Access denied. Only the interviewer can view playback."
          : "Room not found");
        return;
      }
      if (!roomData.room.interview) { setError("No interview found for this room."); return; }

      // Step 2: single playback endpoint
      const interviewId = roomData.room.interview.id;
      const pbRes  = await fetch(`/api/interviews/${interviewId}/playback`, { signal: controller.signal });
      const pbData = await pbRes.json();
      if (!pbRes.ok) { setError(pbData.error || "Failed to load playback data."); return; }
      if (!pbData.timeline?.filter((t) => t.type === "code").length) {
        setError("No recording found. The interview may not have had any code typed, or snapshots were not captured.");
        return;
      }

      setData({ ...pbData, roomTitle: roomData.room.title });
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out");
        setError("Request timed out");
      } else {
        setError("Failed to load playback data.");
      }
    } finally { 
      clearTimeout(timeoutId);
      setLoading(false); 
    }
  }, [roomId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Playback ticker
  useEffect(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (!isPlaying || !data) return;
    const timeline = data.timeline;
    if (currentIndex >= timeline.length - 1) { setIsPlaying(false); return; }
    timeoutRef.current = setTimeout(() => setCurrentIndex((p) => p + 1), 1000 / speed);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, currentIndex, speed, data]);

  // Auto-scroll sidebar
  useEffect(() => {
    if (!eventListRef.current) return;
    const active = eventListRef.current.querySelector("[data-active=\"true\"]");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  function togglePlay() {
    if (!data) return;
    if (currentIndex >= data.timeline.length - 1) { setCurrentIndex(0); setIsPlaying(true); }
    else setIsPlaying((p) => !p);
  }

  const frame = useMemo(() => {
    if (!data) return { code: "", language: "javascript" };
    return deriveFrame(data.timeline, currentIndex, data.interview.language);
  }, [data, currentIndex]);

  // Sidebar items = all non-code timeline items (events + notes)
  const sidebarItems = useMemo(() => {
    if (!data) return [];
    return data.timeline
      .map((item, i) => ({ ...item, timelineIndex: i }))
      .filter((item) => item.type !== "code");
  }, [data]);

  const activeSidebarIdx = useMemo(() => {
    let last = -1;
    for (let i = 0; i < sidebarItems.length; i++) {
      if (sidebarItems[i].timelineIndex <= currentIndex) last = i;
    }
    return last;
  }, [sidebarItems, currentIndex]);

  const timeline   = data?.timeline ?? [];
  const progress   = timeline.length > 1 ? (currentIndex / (timeline.length - 1)) * 100 : 0;
  const startTs    = timeline.length ? new Date(timeline[0].timestamp).getTime() : 0;
  const endTs      = timeline.length ? new Date(timeline[timeline.length - 1].timestamp).getTime() : 0;
  const stats      = data?.stats;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080810]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading playback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080810]">
        <div className="text-center max-w-sm px-4">
          <Film size={48} className="text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">{error}</h2>
          <div className="flex gap-3 justify-center mt-5">
            <button onClick={() => router.push(`/room/${roomId}/report`)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all">
              View Report
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-sm rounded-lg transition-all">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#080810] overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 h-12 bg-[#0a0a12] border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push(`/room/${roomId}/report`)}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <Film size={14} className="text-violet-400 flex-shrink-0" />
          <span className="text-slate-300 text-sm font-medium truncate">{data?.roomTitle}</span>
          <span className="hidden sm:inline text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full flex-shrink-0">
            Playback
          </span>
          {frame.language && (
            <span className="hidden sm:inline text-xs px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-full font-mono flex-shrink-0">
              {frame.language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
          {data?.interview && (
            <>
              <span className="hidden sm:flex items-center gap-1.5">
                <Clock size={11} /> {formatDuration(data.interview.duration)}
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Layers size={11} /> {timeline.length} frames
              </span>
            </>
          )}
          <button
            onClick={() => { setShowStats((v) => !v); setShowEvents(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showStats
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                : "bg-white/[0.04] border-white/[0.07] text-slate-500 hover:text-white"
            }`}
          >
            <BarChart2 size={12} /> Stats
          </button>
          <button
            onClick={() => { setShowEvents((v) => !v); setShowStats(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showEvents
                ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                : "bg-white/[0.04] border-white/[0.07] text-slate-500 hover:text-white"
            }`}
          >
            <List size={12} /> Events
          </button>
          <button onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white rounded-lg border border-white/[0.07] transition-all">
            Dashboard
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Editor */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)" }} />
          <Editor
            height="100%"
            language={frame.language || "javascript"}
            value={frame.code ?? ""}
            theme="vs-dark"
            options={{
              readOnly: true,
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 20 },
              lineNumbers: "on",
              automaticLayout: true,
              renderLineHighlight: "none",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            }}
          />
        </div>

        {/* Stats panel */}
        {showStats && stats && (
          <div className="w-64 flex-shrink-0 border-l border-white/[0.05] bg-[#0a0a12] flex flex-col overflow-y-auto">
            <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Session Stats</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "Snapshots",       value: stats.totalSnapshots },
                { label: "Runs Passed",     value: stats.runsPassed,  color: "text-emerald-400" },
                { label: "Runs Failed",     value: stats.runsFailed,  color: "text-rose-400" },
                { label: "Thinking Time",   value: formatMs(stats.estimatedThinkingTimeMs) },
                { label: "Total Events",    value: stats.totalEvents },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-slate-500 text-xs">{label}</span>
                  <span className={`text-sm font-semibold ${color || "text-white"}`}>{value}</span>
                </div>
              ))}

              {data?.problems?.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-slate-600 uppercase tracking-widest mb-2">Problems</p>
                  {data.problems.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400 text-xs truncate flex-1">{p.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ml-2 flex-shrink-0 ${
                        p.difficulty === "easy" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                        : p.difficulty === "hard" ? "text-rose-400 border-rose-500/20 bg-rose-500/10"
                        : "text-amber-400 border-amber-500/20 bg-amber-500/10"
                      }`}>{p.difficulty}</span>
                    </div>
                  ))}
                </div>
              )}

              {data?.report && (
                <div className="pt-2 border-t border-white/[0.05]">
                  <p className="text-xs text-slate-600 uppercase tracking-widest mb-2">AI Report</p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Overall Score</span>
                    <span className="text-white font-bold">{data.report.overallScore}/100</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-500 text-xs">Recommendation</span>
                    <span className="text-violet-400 text-xs font-medium capitalize">
                      {data.report.recommendation?.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event / notes sidebar */}
        {showEvents && sidebarItems.length > 0 && (
          <div className="w-56 flex-shrink-0 border-l border-white/[0.05] bg-[#0a0a12] flex flex-col">
            <div className="px-3 py-2 border-b border-white/[0.05] flex-shrink-0">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Timeline</span>
            </div>
            <div ref={eventListRef} className="flex-1 overflow-y-auto py-1">
              {sidebarItems.map((item, i) => {
                const meta   = itemMeta(item.type);
                const active = i === activeSidebarIdx;
                const past   = item.timelineIndex <= currentIndex;
                return (
                  <button
                    key={i}
                    data-active={active}
                    onClick={() => { setIsPlaying(false); setCurrentIndex(item.timelineIndex); }}
                    className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-white/[0.06] text-white"
                        : past
                          ? "text-slate-400 hover:bg-white/[0.03]"
                          : "text-slate-600 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${meta.dot} ${past ? "" : "opacity-30"}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: active ? meta.color : undefined }}>
                        {item.type === "language_change" ? `→ ${item.data.label}`
                          : item.type === "note" ? `📝 ${item.data.content?.slice(0, 40)}…`
                          : meta.label}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Playback controls ── */}
      <div className="bg-[#0a0a12] border-t border-white/[0.05] px-5 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">

          {/* Scrubber */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-slate-600 font-mono w-20 flex-shrink-0">
              {timeline[currentIndex] ? formatTime(timeline[currentIndex].timestamp) : "--:--:--"}
            </span>

            <div className="flex-1 relative h-6 flex items-center">
              <div className="absolute inset-x-0 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }} />
              </div>

              {/* Event markers */}
              {timeline.length > 1 && sidebarItems.map((item, i) => {
                const t   = new Date(item.timestamp).getTime();
                const pct = endTs > startTs ? ((t - startTs) / (endTs - startTs)) * 100 : 0;
                const { color } = itemMeta(item.type);
                return (
                  <div key={i} title={`${item.type} @ ${formatTime(item.timestamp)}`}
                    style={{
                      position: "absolute", left: `${pct}%`,
                      width: 6, height: 6, borderRadius: "50%",
                      background: color, transform: "translateX(-50%)", zIndex: 2,
                    }}
                  />
                );
              })}

              <input type="range" min="0" max={Math.max(0, timeline.length - 1)} value={currentIndex}
                onChange={(e) => { setIsPlaying(false); setCurrentIndex(parseInt(e.target.value, 10)); }}
                className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-6"
                style={{ zIndex: 3 }}
              />
            </div>

            <span className="text-xs text-slate-600 font-mono w-20 flex-shrink-0 text-right">
              {timeline.length > 0 ? formatTime(timeline[timeline.length - 1].timestamp) : "--:--:--"}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
              title="Jump to start">
              <SkipBack size={16} />
            </button>

            <button onClick={() => { setIsPlaying(false); setCurrentIndex((p) => Math.max(0, p - 1)); }}
              disabled={currentIndex === 0}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>

            <button onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-600/20 min-w-[100px] justify-center">
              {isPlaying ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Play</>}
            </button>

            <button onClick={() => { setIsPlaying(false); setCurrentIndex((p) => Math.min(timeline.length - 1, p + 1)); }}
              disabled={currentIndex >= timeline.length - 1}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>

            <button onClick={() => { setIsPlaying(false); setCurrentIndex(timeline.length - 1); }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
              title="Jump to end">
              <SkipForward size={16} />
            </button>

            <div className="flex items-center gap-1.5 ml-3 pl-4 border-l border-white/[0.06]">
              <span className="text-xs text-slate-600">Speed</span>
              {[0.5, 1, 2, 4].map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all font-mono ${
                    speed === s ? "bg-violet-600 text-white" : "bg-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.08]"
                  }`}>
                  {s}×
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-600 font-mono ml-2">
              {currentIndex + 1} / {timeline.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
