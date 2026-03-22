"use client";

import { useState, useRef, useEffect } from "react";

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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages — scrollable, takes all available space */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-6">
            No messages yet. Say hello! 👋
          </p>
        )}

        {messages.map((msg) => {
          if (msg.role === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-slate-600 text-xs">{msg.text}</span>
              </div>
            );
          }

          const isMe = msg.sender === userName;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-medium ${
                  msg.role === "interviewer" ? "text-violet-400" : "text-cyan-400"
                }`}>
                  {isMe ? "You" : msg.sender}
                </span>
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

      {/* Input — pinned to bottom, never overflows */}
      <form
        onSubmit={handleSend}
        className="flex-shrink-0 px-3 py-3 border-t border-white/[0.06]"
      >
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
            className="flex-shrink-0 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.05] disabled:text-slate-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}