"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function RoomError({ error, reset }) {
  useEffect(() => {
    console.error("Room error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#04040f] flex items-center justify-center px-4">
      <div className="ambient-orbs">
        <div className="orb orb-violet" />
        <div className="orb orb-cyan" />
      </div>
      
      <div className="relative z-10 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-rose-500/10 to-orange-500/10 border border-rose-500/20 flex items-center justify-center">
          <AlertTriangle size={32} className="text-rose-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3">Room Error</h1>
        
        <p className="text-slate-400 mb-6">
          {process.env.NODE_ENV === "development" 
            ? error?.message || "Failed to load interview room"
            : "Unable to load the interview room. The room may not exist or you may not have access."
          }
        </p>
        
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-600/25"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}