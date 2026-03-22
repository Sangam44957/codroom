"use client";

import { CheckCircle2, XCircle, Clock, MemoryStick } from "lucide-react";

export default function OutputPanel({ output, isRunning }) {
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
      <div className="flex-1 overflow-auto p-3">
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
      </div>
    </div>
  );
}
