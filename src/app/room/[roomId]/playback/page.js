"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import {
  SkipBack, SkipForward, Play, Pause, ChevronLeft,
  ChevronRight, Clock, Film, Layers
} from "lucide-react";

export default function PlaybackPage() {
  const { roomId } = useParams();
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeoutRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (isPlaying && snapshots.length > 1) {
      if (currentIndex >= snapshots.length - 1) { setIsPlaying(false); return; }
      timeoutRef.current = setTimeout(() => setCurrentIndex((p) => p + 1), 1000 / speed);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isPlaying, currentIndex, speed, snapshots.length]);

  async function fetchData() {
    try {
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      const roomData = await roomRes.json();
      if (!roomRes.ok) { setError("Room not found"); return; }
      setRoom(roomData.room);
      if (!roomData.room.interview) { setError("No interview found for this room."); return; }

      const interviewId = roomData.room.interview.id;
      const allSnapshots = [];
      let snapCursor = null;
      do {
        const url = `/api/interviews/${interviewId}/snapshots?limit=200${snapCursor ? `&cursor=${snapCursor}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) break;
        const data = await res.json();
        allSnapshots.push(...(data.snapshots || []));
        snapCursor = data.nextCursor;
      } while (snapCursor);

      if (allSnapshots.length === 0) { setError("No recording found. Make sure code was typed during the interview."); return; }
      setSnapshots(allSnapshots);

      const allEvents = [];
      let evtCursor = null;
      do {
        const url = `/api/interviews/${interviewId}/events?limit=500${evtCursor ? `&cursor=${evtCursor}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) break;
        const data = await res.json();
        allEvents.push(...(data.events || []));
        evtCursor = data.nextCursor;
      } while (evtCursor);
      setEvents(allEvents);
    } catch { setError("Failed to load playback data."); }
    finally { setLoading(false); }
  }

  function togglePlay() {
    if (currentIndex >= snapshots.length - 1) { setCurrentIndex(0); setIsPlaying(true); }
    else setIsPlaying((p) => !p);
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function formatDuration(s) {
    if (!s) return "0m";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

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
            <button onClick={() => router.push(`/room/${roomId}/report`)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all">
              View Report
            </button>
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-sm rounded-lg transition-all">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSnapshot = snapshots[currentIndex];
  const progress = snapshots.length > 1 ? (currentIndex / (snapshots.length - 1)) * 100 : 0;

  return (
    <div className="h-screen flex flex-col bg-[#080810] overflow-hidden">

      {/* ── Cinema header ── */}
      <div className="flex items-center justify-between px-5 h-12 bg-[#0a0a12] border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push(`/room/${roomId}/report`)}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <Film size={14} className="text-violet-400 flex-shrink-0" />
          <span className="text-slate-300 text-sm font-medium truncate">{room?.title}</span>
          <span className="hidden sm:inline text-xs px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full flex-shrink-0">
            Playback
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
          {room?.interview && (
            <>
              <span className="hidden sm:flex items-center gap-1.5">
                <Clock size={11} /> {formatDuration(room.interview.duration)}
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Layers size={11} /> {snapshots.length} frames
              </span>
            </>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white rounded-lg border border-white/[0.07] transition-all"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* ── Editor (cinema spotlight) ── */}
      <div className="flex-1 overflow-hidden relative">
        {/* Subtle vignette */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)" }} />
        <Editor
          height="100%"
          language={room?.interview?.language || "javascript"}
          value={currentSnapshot?.code ?? ""}
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

      {/* ── Playback controls ── */}
      <div className="bg-[#0a0a12] border-t border-white/[0.05] px-5 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">

          {/* Timeline */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-slate-600 font-mono w-20 flex-shrink-0">
              {currentSnapshot ? formatTime(currentSnapshot.timestamp) : "--:--:--"}
            </span>

            <div className="flex-1 relative h-6 flex items-center">
              {/* Track */}
              <div className="absolute inset-x-0 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Event markers */}
              {snapshots.length > 1 && events.map((evt, i) => {
                const evtTime = new Date(evt.timestamp).getTime();
                const startTime = new Date(snapshots[0].timestamp).getTime();
                const endTime = new Date(snapshots[snapshots.length - 1].timestamp).getTime();
                const pct = endTime > startTime ? ((evtTime - startTime) / (endTime - startTime)) * 100 : 0;
                const color = evt.type === "run_pass" ? "#22c55e" : evt.type === "run_fail" ? "#ef4444" : "#f59e0b";
                return (
                  <div
                    key={i}
                    title={`${evt.label} @ ${formatTime(evt.timestamp)}`}
                    style={{ position: "absolute", left: `${pct}%`, width: 6, height: 6, borderRadius: "50%", background: color, transform: "translateX(-50%)", zIndex: 2 }}
                  />
                );
              })}

              {/* Scrubber */}
              <input
                type="range" min="0" max={Math.max(0, snapshots.length - 1)} value={currentIndex}
                onChange={(e) => { setIsPlaying(false); setCurrentIndex(parseInt(e.target.value, 10)); }}
                className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-6"
                style={{ zIndex: 3 }}
              />
            </div>

            <span className="text-xs text-slate-600 font-mono w-20 flex-shrink-0 text-right">
              {snapshots.length > 0 ? formatTime(snapshots[snapshots.length - 1].timestamp) : "--:--:--"}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Jump to start */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
              title="Jump to start"
            >
              <SkipBack size={16} />
            </button>

            {/* Step back */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentIndex((p) => Math.max(0, p - 1)); }}
              disabled={currentIndex === 0}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-600/20 min-w-[100px] justify-center"
            >
              {isPlaying ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Play</>}
            </button>

            {/* Step forward */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentIndex((p) => Math.min(snapshots.length - 1, p + 1)); }}
              disabled={currentIndex >= snapshots.length - 1}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>

            {/* Jump to end */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentIndex(snapshots.length - 1); }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
              title="Jump to end"
            >
              <SkipForward size={16} />
            </button>

            {/* Speed */}
            <div className="flex items-center gap-1.5 ml-3 pl-4 border-l border-white/[0.06]">
              <span className="text-xs text-slate-600">Speed</span>
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all font-mono ${
                    speed === s ? "bg-violet-600 text-white" : "bg-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Counter */}
            <span className="text-xs text-slate-600 font-mono ml-2">
              {currentIndex + 1} / {snapshots.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
