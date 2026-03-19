"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";

export default function PlaybackPage() {
  const params = useParams();
  const roomId = params.roomId;

  const [room, setRoom] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeoutRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Playback engine
  useEffect(() => {
    // Clear any running timeout on every render of this effect
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isPlaying && snapshots.length > 1) {
      if (currentIndex >= snapshots.length - 1) {
        // Reached the end — stop
        setIsPlaying(false);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000 / speed);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isPlaying, currentIndex, speed, snapshots.length]);

  async function fetchData() {
    try {
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      const roomData = await roomRes.json();

      if (!roomRes.ok) {
        setError("Room not found");
        return;
      }

      setRoom(roomData.room);

      if (!roomData.room.interview) {
        setError("No interview found for this room. Start and complete an interview first.");
        return;
      }

      const snapRes = await fetch(
        `/api/interviews/${roomData.room.interview.id}/snapshots`
      );
      const snapData = await snapRes.json();

      if (!snapRes.ok || !snapData.snapshots || snapData.snapshots.length === 0) {
        setError("No recording found. Make sure code was typed during the interview.");
        return;
      }

      setSnapshots(snapData.snapshots);
    } catch {
      setError("Failed to load playback data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function togglePlay() {
    if (currentIndex >= snapshots.length - 1) {
      // Restart from beginning
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }

  function handleSliderChange(e) {
    setIsPlaying(false);
    setCurrentIndex(parseInt(e.target.value, 10));
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDuration(seconds) {
    if (!seconds) return "0m 0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }

  // ─── Render states ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-gray-400 text-lg">Loading playback...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
          <div className="flex gap-3 justify-center mt-4">
            <a
              href={`/room/${roomId}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all"
            >
              Back to Room
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentSnapshot = snapshots[currentIndex];
  const progress =
    snapshots.length > 1 ? (currentIndex / (snapshots.length - 1)) * 100 : 0;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <a
            href="/dashboard"
            className="text-lg font-bold text-white hover:text-blue-400 transition-all flex-shrink-0"
          >
            CodRoom
          </a>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300 text-sm truncate">{room?.title}</span>
          <span className="px-3 py-1 text-xs rounded-full bg-orange-900/30 text-orange-400 border border-orange-800 flex-shrink-0">
            🎬 Playback
          </span>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {room?.interview && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>Duration: {formatDuration(room.interview.duration)}</span>
              <span className="text-gray-600">•</span>
              <span>{snapshots.length} snapshots</span>
            </div>
          )}
          <a
            href={`/room/${roomId}`}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all border border-gray-700"
          >
            Back to Room
          </a>
        </div>
      </div>

      {/* Monaco Editor (read-only playback) */}
      <div className="flex-1 overflow-hidden">
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
            padding: { top: 16 },
            lineNumbers: "on",
            automaticLayout: true,
            // Prevent cursor flicker during playback
            renderLineHighlight: "none",
          }}
        />
      </div>

      {/* Playback Controls */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Timeline row */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-gray-500 w-24 flex-shrink-0">
              {currentSnapshot ? formatTime(currentSnapshot.timestamp) : "--:--:--"}
            </span>

            {/* FIX: Use CSS background gradient for progress instead of an
                overlapping div that blocked pointer events on the range input */}
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={Math.max(0, snapshots.length - 1)}
                value={currentIndex}
                onChange={handleSliderChange}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #2563eb ${progress}%, #374151 ${progress}%)`,
                }}
              />
            </div>

            <span className="text-xs text-gray-500 w-24 flex-shrink-0 text-right">
              {snapshots.length > 0
                ? formatTime(snapshots[snapshots.length - 1].timestamp)
                : "--:--:--"}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Rewind to start */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(0);
              }}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-all"
              title="Jump to start"
            >
              ⏮
            </button>

            {/* Step back */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentIndex === 0}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-lg text-sm transition-all"
              title="Previous snapshot"
            >
              ◀ Prev
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all min-w-[100px]"
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>

            {/* Step forward */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex((prev) => Math.min(snapshots.length - 1, prev + 1));
              }}
              disabled={currentIndex >= snapshots.length - 1}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-lg text-sm transition-all"
              title="Next snapshot"
            >
              Next ▶
            </button>

            {/* Jump to end */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(snapshots.length - 1);
              }}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-all"
              title="Jump to end"
            >
              ⏭
            </button>

            {/* Speed selector */}
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-700">
              <span className="text-xs text-gray-500">Speed:</span>
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    speed === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Counter */}
            <span className="text-xs text-gray-500 ml-2">
              {currentIndex + 1} / {snapshots.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
