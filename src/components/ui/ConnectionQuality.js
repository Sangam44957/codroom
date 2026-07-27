"use client";

import { Wifi, WifiOff } from "lucide-react";

export default function ConnectionQuality({ isConnected }) {
  return (
    <span
      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
        isConnected
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
      }`}
      title={isConnected ? "Connected" : "Disconnected"}
    >
      {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
      <span className="hidden sm:inline">{isConnected ? "Live" : "Off"}</span>
    </span>
  );
}
