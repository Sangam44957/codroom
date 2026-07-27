"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/problems",  label: "Problems" },
  { href: "/analytics", label: "Analytics" },
];

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      await fetch("/api/auth/logout", { method: "POST", signal: controller.signal });
      clearTimeout(timeoutId);
      router.push("/login");
      router.refresh();
    } catch { setLoggingOut(false); }
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#04040f]/80 backdrop-blur-2xl border-b border-[var(--glass-border)]">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-black text-white group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/25"
              style={{ background: "var(--accent-gradient)" }}
            >C</div>
            <span className="text-base font-bold text-white tracking-tight font-[family-name:var(--font-display)]">CodRoom</span>
          </Link>
          {user && (
            <div className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all ${
                      active
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                    }`}
                    style={active ? {
                      background: "rgba(124,58,237,0.12)",
                      boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.25)",
                    } : undefined}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
                        style={{ background: "var(--accent-gradient)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "var(--accent-gradient)" }}
              >
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-slate-300 text-sm font-medium">{user.name}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-[var(--radius-sm)] border border-[var(--glass-border)] hover:border-white/[0.14] hover:bg-white/[0.04] disabled:opacity-40 transition-all"
          >
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </nav>
  );
}
