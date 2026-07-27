"use client";

import { useState, useRef, useEffect } from "react";
import { Wifi, WifiOff, X } from "lucide-react";

function getQuality(latency) {
  if (latency === null) return { label: "—", color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20" };
  if (latency < 100) return { label: "Good", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (latency < 300) return { label: "Degraded", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  return { label: "Poor", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
}

export default function ConnectionQuality({ latency, reconnectCount, isConnected, onForceReconnect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = getQuality(isConnected ? latency : null);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${q.bg} ${q.color}`}
        title="Connection quality"
      >
        {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span className="hidden sm:inline">{isConnected ? q.label : "Off"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#111118] border border-white/[0.08] rounded-xl shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Connection</span>
            <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-white transition-colors">
              <X size={12} />
            </button>
          </div>
          <div className="space-y-1.5 text-xs mb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Latency</span>
              <span className={q.color}>{latency !== null ? `${latency}ms` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quality</span>
              <span className={q.color}>{q.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reconnects</span>
              <span className="text-slate-300">{reconnectCount}</span>
            </div>
          </div>
          <button
            onClick={() => { onForceReconnect?.(); setOpen(false); }}
            className="w-full py-1.5 text-xs rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all"
          >
            Force Reconnect
          </button>
        </div>
      )}
    </div>
  );
}
