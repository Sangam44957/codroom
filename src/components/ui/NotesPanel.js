"use client";

import { useState, useEffect, useRef } from "react";

export default function NotesPanel({ roomId }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const initialLoadRef = useRef(true);

  // Load the single persisted note on mount
  useEffect(() => {
    async function loadNotes() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/notes`);
        if (res.ok) {
          const data = await res.json();
          if (data.note?.content) setNotes(data.note.content);
        }
      } catch {}
      initialLoadRef.current = false;
    }
    loadNotes();
  }, [roomId]);

  // Auto-save 3s after last keystroke, skip the initial load
  useEffect(() => {
    if (initialLoadRef.current) return;
    const timer = setTimeout(() => saveNotes(), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  async function saveNotes() {
    setSaving(true);
    try {
      await fetch(`/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: notes }),
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setSaving(false);
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">📝 Notes</h3>
          {saving && <span className="text-yellow-400 text-xs">Saving...</span>}
          {lastSaved && !saving && (
            <span className="text-gray-500 text-xs">Saved {formatTime(lastSaved)}</span>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-4 py-2 bg-purple-900/20 border-b border-gray-800">
        <p className="text-purple-400 text-xs">🔒 Private - Only you can see these notes</p>
      </div>

      {/* Text Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your observations...\n\n• Problem-solving approach\n• Communication skills\n• Code quality\n• Areas for improvement"
          className="w-full h-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm p-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>
    </div>
  );
}