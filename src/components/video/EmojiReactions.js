"use client";

import { useState, useEffect, useCallback } from "react";

const REACTIONS = ["👍", "😕", "⏳", "🎉"];

export default function EmojiReactions({ onSendReaction, onRemoteReaction }) {
  const [floating, setFloating] = useState([]);

  const addFloating = useCallback((emoji, id) => {
    setFloating((prev) => [...prev, { emoji, id, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloating((prev) => prev.filter((r) => r.id !== id)), 2500);
  }, []);

  useEffect(() => {
    onRemoteReaction?.((emoji) => addFloating(emoji, `remote-${Date.now()}`));
  }, [onRemoteReaction, addFloating]);

  function send(emoji) {
    const id = `local-${Date.now()}`;
    addFloating(emoji, id);
    onSendReaction?.(emoji);
  }

  return (
    <div className="relative">
      {/* Floating overlays */}
      {floating.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-full pointer-events-none animate-reaction-float text-2xl"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Reaction buttons */}
      <div className="flex items-center justify-center gap-2 py-1">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => send(emoji)}
            className="text-lg w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] hover:scale-125 transition-all flex items-center justify-center"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
