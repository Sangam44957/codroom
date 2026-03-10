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
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-4">
            No messages yet. Say hello! 👋
          </p>
        )}

        {messages.map((msg) => {
          // System message
          if (msg.role === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-gray-500 text-xs">{msg.text}</span>
              </div>
            );
          }

          const isMe = msg.sender === userName;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {/* Sender name */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-medium ${
                    msg.role === "interviewer"
                      ? "text-purple-400"
                      : "text-blue-400"
                  }`}
                >
                  {isMe ? "You" : msg.sender}
                </span>
                <span className="text-gray-600 text-xs">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Message bubble */}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  isMe
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-gray-800"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}