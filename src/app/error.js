"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Root error:", error);
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
        
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        
        <p className="text-slate-400 mb-6">
          {process.env.NODE_ENV === "development" 
            ? error?.message || "An unexpected error occurred"
            : "We encountered an unexpected error. Please try again."
          }
        </p>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-600/25"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] hover:border-white/[0.2] rounded-xl font-semibold transition-all"
          >
            <Home size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}