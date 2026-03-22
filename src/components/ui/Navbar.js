"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar({ user }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch { setLoggingOut(false); }
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#04040f]/80 backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-black text-white group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/25">C</div>
            <span className="text-base font-bold text-white tracking-tight">CodRoom</span>
          </Link>
          {user && (
            <div className="flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/[0.05] transition-all">Dashboard</Link>
              <Link href="/problems"  className="px-3 py-1.5 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/[0.05] transition-all">Problems</Link>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-slate-300 text-sm font-medium">{user.name}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.04] disabled:opacity-40 transition-all"
          >
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </nav>
  );
}
