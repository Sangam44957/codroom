"use client";

import { Wifi, WifiOff, AlertCircle } from "lucide-react";

export default function ConnectionStatus({ isConnected, serverStateLost }) {
  if (isConnected && !serverStateLost) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
        <Wifi size={12} />
        <span>Connected</span>
      </div>
    );
  }

  if (serverStateLost) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">
        <AlertCircle size={12} />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
      <WifiOff size={12} />
      <span>Disconnected</span>
    </div>
  );
}