"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

// Collapse consecutive system messages about the same person into one
function collapseSystemMessages(messages) {
  const result = [];
  for (const msg of messages) {
    if (msg.role !== "system") { result.push(msg); continue; }
    const prev = result[result.length - 1];
    if (prev?.role === "system" && prev.text === msg.text) {
      result[result.length - 1] = { ...prev, count: (prev.count || 1) + 1 };
    } else {
      result.push({ ...msg, count: 1 });
    }
  }
  return result;
}

export default function ChatPanel({ messages, onSendMessage, userName }) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const collapsed = collapseSystemMessages(messages);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {collapsed.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-6">No messages yet. Say hello! 👋</p>
        )}

        {collapsed.map((msg) => {
          if (msg.role === "system") {
            return (
              <div key={msg.id} className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-white/[0.04]" />
                <span className="text-slate-600 text-[11px] whitespace-nowrap">
                  {msg.text}{msg.count > 1 ? ` ×${msg.count}` : ""}
                </span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>
            );
          }

          const isMe = msg.sender === userName;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-medium ${
                  msg.role === "interviewer" ? "text-violet-400" : "text-cyan-400"
                }`}>{isMe ? "You" : msg.sender}</span>
                <span className="text-slate-700 text-xs">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                isMe
                  ? "bg-violet-600 text-white"
                  : "bg-white/[0.06] text-slate-200 border border-white/[0.06]"
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex-shrink-0 px-3 py-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1 min-w-0 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.05] disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}