"use client";

import { Shield, Eye, Monitor, Clipboard, Mouse, Keyboard, Wrench } from "lucide-react";

const VIOLATION_META = {
  tab_switch:      { label: "Tab Switch",       icon: Eye,       color: "text-amber-400",  bg: "bg-amber-500/10  border-amber-500/20"  },
  window_blur:     { label: "Window Blur",      icon: Eye,       color: "text-amber-400",  bg: "bg-amber-500/10  border-amber-500/20"  },
  fullscreen_exit: { label: "Left Fullscreen",  icon: Monitor,   color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  paste_detected:  { label: "Code Pasted",      icon: Clipboard, color: "text-rose-400",   bg: "bg-rose-500/10   border-rose-500/20"   },
  copy_detected:   { label: "Code Copied",      icon: Clipboard, color: "text-rose-400",   bg: "bg-rose-500/10   border-rose-500/20"   },
  right_click:     { label: "Right Click",      icon: Mouse,     color: "text-slate-400",  bg: "bg-white/[0.04]  border-white/[0.08]"  },
  alt_tab:         { label: "Alt+Tab",          icon: Keyboard,  color: "text-amber-400",  bg: "bg-amber-500/10  border-amber-500/20"  },
  devtools:        { label: "DevTools Attempt", icon: Wrench,    color: "text-rose-400",   bg: "bg-rose-500/10   border-rose-500/20"   },
};

const RISK = {
  clean:  { label: "Clean",       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  low:    { label: "Low Risk",    color: "text-amber-400",   bg: "bg-amber-500/10   border-amber-500/20",   dot: "bg-amber-400"   },
  medium: { label: "Medium Risk", color: "text-orange-400",  bg: "bg-orange-500/10  border-orange-500/20",  dot: "bg-orange-400"  },
  high:   { label: "High Risk",   color: "text-rose-400",    bg: "bg-rose-500/10    border-rose-500/20",    dot: "bg-rose-400"    },
};

function riskLevel(count) {
  if (count === 0) return "clean";
  if (count <= 2)  return "low";
  if (count <= 5)  return "medium";
  return "high";
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function SecurityPanel({ violations }) {
  const level = riskLevel(violations.length);
  const risk  = RISK[level];

  // Count by type for summary
  const counts = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-[#0f0f17]">

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2 flex-shrink-0">
        <Shield size={13} className="text-violet-400" />
        <span className="text-sm font-semibold text-white">Security Monitor</span>
      </div>

      {/* Risk badge */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${risk.bg}`}>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot} animate-pulse`} />
            <span className={`text-xs font-semibold ${risk.color}`}>{risk.label}</span>
          </div>
          <span className="text-slate-500 text-xs">
            {violations.length} event{violations.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Summary chips */}
      {Object.keys(counts).length > 0 && (
        <div className="px-4 pb-3 flex-shrink-0 border-b border-white/[0.05]">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Summary</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(counts).map(([type, count]) => {
              const meta = VIOLATION_META[type] || { label: type, color: "text-slate-400", bg: "bg-white/[0.04] border-white/[0.08]" };
              return (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium ${meta.bg} ${meta.color}`}
                >
                  {meta.label}
                  <span className="opacity-60">×{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield size={16} className="text-emerald-400" />
            </div>
            <p className="text-slate-600 text-xs text-center">No suspicious activity detected</p>
          </div>
        ) : (
          [...violations].reverse().map((v) => {
            const meta = VIOLATION_META[v.type] || {
              label: v.type, icon: Shield,
              color: "text-slate-400", bg: "bg-white/[0.04] border-white/[0.08]",
            };
            const Icon = meta.icon;
            return (
              <div
                key={v.id}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]"
              >
                <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center ${meta.bg}`}>
                  <Icon size={11} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">{formatTime(v.timestamp)}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{v.details}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
