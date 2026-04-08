"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import {
  SkipBack, SkipForward, Play, Pause, ChevronLeft,
  ChevronRight, Clock, Film, Layers, List,
} from "lucide-react";

// ── Event metadata ────────────────────────────────────────────────────────────
const EVT_META = {
  run_pass:        { color: "#22c55e", dot: "bg-emerald-500", label: "Run passed" },
  run_fail:        { color: "#ef4444", dot: "bg-rose-500",    label: "Run failed" },
  language_change: { color: "#a78bfa", dot: "bg-violet-400",  label: "Language" },
  default:         { color: "#f59e0b", dot: "bg-amber-400",   label: "Event" },
};

function evtMeta(type) { return EVT_META[type] ?? EVT_META.default; }

// ── Build merged timeline ─────────────────────────────────────────────────────
// Returns an array of frames sorted by timestamp.
// Each frame: { timestamp, code, language, events[] }
// events[] = all InterviewEvents that fall between this frame and the next.
function buildTimeline(snapshots, events, baseLanguage) {
  if (!snapshots.length) return [];

  // Sort both by timestamp ascending (they should already be, but be safe)
  const snaps = [...snapshots].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp));
  const evts  = [...events].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp));

  // Walk through snapshots; for each frame derive the language by scanning
  // all language_change events that occurred at or before this snapshot.
  const frames = snaps.map((snap, i) => {
    const snapTs = new Date(snap.timestamp).getTime();

    // Language = last language_change event at or before this snapshot
    let lang = baseLanguage;
    for (const e of evts) {
      if (e.type === "language_change" && new Date(e.timestamp).getTime() <= snapTs) {
        lang = e.label;
      }
    }

    // Events that "belong" to this frame = events between this snapshot and the next
    const nextTs = snaps[i + 1]
      ? new Date(snaps[i + 1].timestamp).getTime()
      : Infinity;
    const frameEvts = evts.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= snapTs && t < nextTs;
    });

    return { timestamp: snap.timestamp, code: snap.code, language: lang, events: frameEvts };
  });

  return frames;
}

export default function PlaybackPage() {
  const { roomId } = useParams();
  const router = useRouter();

  const [room, setRoom]           = useState(null);
  const [timeline, setTimeline]   = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed]         = useState(1);
  const [showEvents, setShowEvents] = useState(true);

  const timeoutRef  = useRef(null);
  const eventListRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  // Playback ticker
  useEffect(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (isPlaying && timeline.length > 1) {
      if (currentIndex >= timeline.length - 1) { setIsPlaying(false); return; }
      timeoutRef.current = setTimeout(() => setCurrentIndex((p) => p + 1), 1000 / speed);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, currentIndex, speed, timeline.length]);

  // Auto-scroll event list to keep active event visible
  useEffect(() => {
    if (!eventListRef.current) return;
    const active = eventListRef.current.querySelector("[data-active=\"true\"]");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  async function fetchData() {
    try {
      const roomRes  = await fetch(`/api/rooms/${roomId}`);
      const roomData = await roomRes.json();
      if (!roomRes.ok) { setError("Room not found"); return; }
      setRoom(roomData.room);
      if (!roomData.room.interview) { setError("No interview found for this room."); return; }

      const interviewId = roomData.room.interview.id;

      // Fetch all snapshots (paginated)
      const allSnapshots = [];
      let snapCursor = null;
      do {
        const url = `/api/interviews/${interviewId}/snapshots?limit=200${snapCursor ? `&cursor=${snapCursor}` : ""}`;
        const res  = await fetch(url);
        if (!res.ok) break;
        const data = await res.json();
        allSnapshots.push(...(data.snapshots || []));
        snapCursor = data.nextCursor;
      } while (snapCursor);

      if (!allSnapshots.length) {
        setError("No recording found. Make sure code was typed during the interview.");
        return;
      }

      // Fetch all events (paginated)
      const evts = [];
      let evtCursor = null;
      do {
        const url = `/api/interviews/${interviewId}/events?limit=500${evtCursor ? `&cursor=${evtCursor}` : ""}`;
        const res  = await fetch(url);
        if (!res.ok) break;
        const data = await res.json();
        evts.push(...(data.events || []));
        evtCursor = data.nextCursor;
      } while (evtCursor);

      setAllEvents(evts);
      setTimeline(buildTimeline(
        allSnapshots,
        evts,
        roomData.room.interview.language || "javascript",
      ));
    } catch { setError("Failed to load playback data."); }
    finally  { setLoading(false); }
  }

  function togglePlay() {
    if (currentIndex >= timeline.length - 1) { setCurrentIndex(0); setIsPlaying(true); }
    else setIsPlaying((p) => !p);
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

  // Flat list of all events with the frame index they belong to (for sidebar)
  const sidebarEvents = useMemo(() => {
    const out = [];
    timeline.forEach((frame, fi) => {
      frame.events.forEach((e) => out.push({ ...e, frameIndex: fi }));
    });
    return out;
  }, [timeline]);

  // Which sidebar event is "active" = last event at or before currentIndex
  const activeSidebarIdx = useMemo(() => {
    let last = -1;
    for (let i = 0; i < sidebarEvents.length; i++) {
      if (sidebarEvents[i].frameIndex <= currentIndex) last = i;
    }
    return last;
  }, [sidebarEvents, currentIndex]);

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

  const frame    = timeline[currentIndex];
  const progress = timeline.length > 1 ? (currentIndex / (timeline.length - 1)) * 100 : 0;
  const startTs  = timeline.length ? new Date(timeline[0].timestamp).getTime() : 0;
  const endTs    = timeline.length ? new Date(timeline[timeline.length - 1].timestamp).getTime() : 0;

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
          <span className="text-slate-300 text-sm font-medium truncate">{room?.title}</span>
          <span className="hidden sm:inline text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full flex-shrink-0">
            Playback
          </span>
          {/* Live language badge */}
          {frame?.language && (
            <span className="hidden sm:inline text-xs px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-full font-mono flex-shrink-0">
              {frame.language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
          {room?.interview && (
            <>
              <span className="hidden sm:flex items-center gap-1.5">
                <Clock size={11} /> {formatDuration(room.interview.duration)}
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Layers size={11} /> {timeline.length} frames
              </span>
            </>
          )}
          <button
            onClick={() => setShowEvents((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showEvents
                ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                : "bg-white/[0.04] border-white/[0.07] text-slate-500 hover:text-white"
            }`}
            title="Toggle event timeline"
          >
            <List size={12} /> Events
          </button>
          <button onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white rounded-lg border border-white/[0.07] transition-all">
            Dashboard
          </button>
        </div>
      </div>

      {/* ── Body: editor + optional event sidebar ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Editor */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)" }} />
          <Editor
            height="100%"
            language={frame?.language || "javascript"}
            value={frame?.code ?? ""}
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

        {/* Event sidebar */}
        {showEvents && sidebarEvents.length > 0 && (
          <div className="w-56 flex-shrink-0 border-l border-white/[0.05] bg-[#0a0a12] flex flex-col">
            <div className="px-3 py-2 border-b border-white/[0.05] flex-shrink-0">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Timeline</span>
            </div>
            <div ref={eventListRef} className="flex-1 overflow-y-auto py-1">
              {sidebarEvents.map((e, i) => {
                const meta   = evtMeta(e.type);
                const active = i === activeSidebarIdx;
                const past   = e.frameIndex <= currentIndex;
                return (
                  <button
                    key={e.id ?? i}
                    data-active={active}
                    onClick={() => { setIsPlaying(false); setCurrentIndex(e.frameIndex); }}
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
                        {e.type === "language_change" ? `→ ${e.label}` : meta.label}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                        {formatTime(e.timestamp)}
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

          {/* Timeline scrubber */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-slate-600 font-mono w-20 flex-shrink-0">
              {frame ? formatTime(frame.timestamp) : "--:--:--"}
            </span>

            <div className="flex-1 relative h-6 flex items-center">
              {/* Track */}
              <div className="absolute inset-x-0 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }} />
              </div>

              {/* Event markers on scrubber */}
              {timeline.length > 1 && allEvents.map((evt, i) => {
                const t   = new Date(evt.timestamp).getTime();
                const pct = endTs > startTs ? ((t - startTs) / (endTs - startTs)) * 100 : 0;
                const { color } = evtMeta(evt.type);
                return (
                  <div key={i} title={`${evt.label} @ ${formatTime(evt.timestamp)}`}
                    style={{
                      position: "absolute", left: `${pct}%`,
                      width: 6, height: 6, borderRadius: "50%",
                      background: color, transform: "translateX(-50%)", zIndex: 2,
                    }}
                  />
                );
              })}

              {/* Scrubber input */}
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

            {/* Speed */}
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
