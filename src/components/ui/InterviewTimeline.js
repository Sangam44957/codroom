"use client";

import { CheckCircle2, XCircle, Play, Square, MessageSquare, Clock } from "lucide-react";

const EVENT_META = {
  interview_started: { icon: Play,          color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", label: "Interview Started" },
  interview_ended:   { icon: Square,         color: "text-rose-400",   bg: "bg-rose-500/10 border-rose-500/20",   label: "Interview Ended" },
  run_pass:          { icon: CheckCircle2,   color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20", label: "Run Passed" },
  run_fail:          { icon: XCircle,        color: "text-rose-400",   bg: "bg-rose-500/10 border-rose-500/20",   label: "Run Failed" },
  test_pass:         { icon: CheckCircle2,   color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20", label: "Tests Passed" },
  test_fail:         { icon: XCircle,        color: "text-rose-400",   bg: "bg-rose-500/10 border-rose-500/20",   label: "Tests Failed" },
  chat:              { icon: MessageSquare,  color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",   label: "Chat Message" },
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function InterviewTimeline({ events = [], messages = [] }) {
  // Merge timeline events + chat messages into one sorted list
  const combined = [
    ...events.map((e) => ({ ...e, _kind: "event" })),
    ...messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        _kind: "chat",
        type: "chat",
        timestamp: m.timestamp,
        label: `${m.sender}: ${m.text?.slice(0, 60)}${m.text?.length > 60 ? "…" : ""}`,
      })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="flex flex-col h-full bg-[#0d0d18]">
      <div className="flex items-center gap-2 px-4 h-8 bg-[#111118] border-b border-white/[0.06] flex-shrink-0">
        <Clock size={11} className="text-violet-400" />
        <span className="text-xs font-medium text-slate-400">Interview Timeline</span>
        <span className="ml-auto text-xs text-slate-600">{combined.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {combined.length === 0 && (
          <p className="text-slate-700 text-xs text-center mt-6">Events will appear here as the interview progresses.</p>
        )}
        {combined.map((e, i) => {
          const meta = EVENT_META[e.type] ?? { icon: Clock, color: "text-slate-400", bg: "bg-white/[0.04] border-white/[0.08]", label: e.type };
          const Icon = meta.icon;
          return (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${meta.bg}`}>
              <Icon size={11} className={`flex-shrink-0 mt-0.5 ${meta.color}`} />
              <span className="flex-1 text-slate-300 leading-snug">{e.label || meta.label}</span>
              <span className="flex-shrink-0 text-slate-600 font-mono text-[10px]">{formatTime(e.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
