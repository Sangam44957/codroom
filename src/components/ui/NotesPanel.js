"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function NotesPanel({ roomId }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const initialLoadRef = useRef(true);

  // Load the single persisted note on mount
  useEffect(() => {
    const controller = new AbortController();
    async function loadNotes() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/notes`, {
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          if (data.note?.content) setNotes(data.note.content);
        }
      } catch {}
      initialLoadRef.current = false;
    }
    loadNotes();
    return () => controller.abort();
  }, [roomId]);

  const saveNotes = useCallback(async () => {
    setSaving(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      await fetch(`/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: notes }),
        signal: controller.signal
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      clearTimeout(timeoutId);
      setSaving(false);
    }
  }, [roomId, notes]);

  // Auto-save 3s after last keystroke, skip the initial load
  useEffect(() => {
    if (initialLoadRef.current) return;
    const timer = setTimeout(() => saveNotes(), 3000);
    return () => clearTimeout(timer);
  }, [notes, saveNotes]);

  function formatTime(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d18]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">📝 Notes</h3>
          {saving && <span className="text-amber-400 text-xs">Saving...</span>}
          {lastSaved && !saving && (
            <span className="text-slate-500 text-xs">Saved {formatTime(lastSaved)}</span>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-4 py-2 bg-violet-500/10 border-b border-white/[0.06]">
        <p className="text-violet-400 text-xs">🔒 Private — Only you can see these notes</p>
      </div>

      {/* Text Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your observations...\n\n• Problem-solving approach\n• Communication skills\n• Code quality\n• Areas for improvement"
          className="w-full h-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white text-sm p-3 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
        />
      </div>
    </div>
  );
}