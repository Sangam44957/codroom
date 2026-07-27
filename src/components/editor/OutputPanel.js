"use client";

import { CheckCircle2, XCircle, Clock, Lightbulb } from "lucide-react";

// Micro-feedback tips keyed by output characteristics
const STYLE_TIPS = [
  { test: (o) => /console\.log|print\(/.test(o.output ?? "") && o.status !== "error", tip: "Tip: Remove debug logs before submitting — use return values instead." },
  { test: (o) => o.status !== "error" && (o.time > 1), tip: "Tip: Execution took >1s — consider optimising time complexity." },
  { test: (o) => o.status === "error" && /undefined/.test(o.output ?? ""), tip: "Tip: 'undefined' errors often mean a variable is used before assignment." },
  { test: (o) => o.status === "error" && /null/.test(o.output ?? ""), tip: "Tip: Check for null/undefined before accessing properties." },
  { test: (o) => o.status === "error" && /index/.test(o.output?.toLowerCase() ?? ""), tip: "Tip: Index out of bounds — verify loop bounds and array lengths." },
  { test: (o) => o.status === "error" && /recursion|stack/.test(o.output?.toLowerCase() ?? ""), tip: "Tip: Stack overflow detected — ensure your recursion has a valid base case." },
  { test: (o) => o.status !== "error" && o.output?.trim() === "", tip: "Tip: No output produced — did you forget to print or return a value?" },
  { test: (o) => o.status !== "error", tip: "Tip: Great run! Consider edge cases: empty input, negatives, large values." },
];

function getMicroFeedback(output) {
  if (!output) return null;
  const match = STYLE_TIPS.find((t) => t.test(output));
  return match?.tip ?? null;
}

export default function OutputPanel({ output, isRunning }) {
  const tip = getMicroFeedback(output);

  return (
    <div className="h-full flex flex-col bg-[#0d0d18]">
      {/* Tab header */}
      <div className="flex items-center gap-4 px-4 h-8 bg-[#111118] border-b border-white/[0.06] flex-shrink-0">
        <span className="text-xs font-medium text-slate-400 border-b-2 border-violet-500 pb-0.5">
          Output
        </span>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            Running…
          </span>
        )}
        {output && !isRunning && (
          <span className={`flex items-center gap-1 text-xs ${output.status === "error" ? "text-rose-400" : "text-emerald-400"}`}>
            {output.status === "error"
              ? <XCircle size={11} />
              : <CheckCircle2 size={11} />}
            {output.type}
          </span>
        )}
        {output?.time && (
          <span className="flex items-center gap-1 text-xs text-slate-600 ml-auto">
            <Clock size={10} /> {output.time}s
            {output.memory && <><span className="mx-1">·</span>{(output.memory / 1024).toFixed(1)}MB</>}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {isRunning && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            Executing code…
          </div>
        )}

        {!isRunning && !output && (
          <p className="text-slate-700 text-xs">Press Run to execute your code</p>
        )}

        {!isRunning && output && (
          <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed p-3 rounded-lg border ${
            output.status === "error"
              ? "text-rose-300 bg-rose-500/5 border-rose-500/15"
              : "text-emerald-300 bg-emerald-500/5 border-emerald-500/15"
          }`}>
            {output.output}
          </pre>
        )}

        {/* Micro-feedback tip */}
        {!isRunning && tip && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-300 text-xs">
            <Lightbulb size={12} className="flex-shrink-0 mt-0.5" />
            <span>{tip}</span>
          </div>
        )}
      </div>
    </div>
  );
}
