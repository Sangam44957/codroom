"use client";

import { useState, useEffect } from "react";

export default function VideoDebug({ users, isConnected }) {
  const [socketEvents, setSocketEvents] = useState([]);

  useEffect(() => {
    // Listen for peer connection events
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      if (args[0]?.includes?.("🎥") || args[0]?.includes?.("📞") || args[0]?.includes?.("📡")) {
        setSocketEvents(prev => [...prev.slice(-9), { 
          time: new Date().toLocaleTimeString(), 
          message: args.join(" "),
          type: "info"
        }]);
      }
      originalLog(...args);
    };

    console.warn = (...args) => {
      if (args[0]?.includes?.("peer") || args[0]?.includes?.("call")) {
        setSocketEvents(prev => [...prev.slice(-9), { 
          time: new Date().toLocaleTimeString(), 
          message: args.join(" "),
          type: "warn"
        }]);
      }
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-black/90 border border-white/20 rounded-lg p-3 text-xs text-white z-50">
      <div className="font-bold mb-2">Video Debug</div>
      
      <div className="mb-2">
        <div>Socket: {isConnected ? "✅ Connected" : "❌ Disconnected"}</div>
        <div>Users: {users.length}</div>
      </div>

      <div className="mb-2">
        <div className="font-semibold">Recent Events:</div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {socketEvents.map((event, i) => (
            <div key={i} className={`text-xs ${event.type === 'warn' ? 'text-amber-300' : 'text-green-300'}`}>
              <span className="text-gray-400">{event.time}</span> {event.message}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Check browser console for full logs
      </div>
    </div>
  );
}