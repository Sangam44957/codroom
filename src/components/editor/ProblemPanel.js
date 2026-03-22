"use client";

import { useState } from "react";

const DIFF_CLS = {
  easy:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function ProblemPanel({ problem }) {
  const [activeTab, setActiveTab] = useState("description");
  if (!problem) return null;
  const testCases = problem.testCases || [];

  return (
    <div className="flex flex-col h-full bg-[#0d0d18]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white leading-snug">{problem.title}</h3>
          <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded border capitalize font-medium ${DIFF_CLS[problem.difficulty] || "text-slate-400 bg-white/[0.04] border-white/[0.08]"}`}>
            {problem.difficulty}
          </span>
        </div>
        {problem.topic && (
          <span className="text-[10px] text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded capitalize">
            {problem.topic}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {[
          { id: "description", label: "Description" },
          { id: "testcases",   label: `Examples (${testCases.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${
              activeTab === t.id
                ? "text-white border-b-2 border-violet-500"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {activeTab === "description" && (
          <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[13px]">
            {problem.description}
          </div>
        )}

        {activeTab === "testcases" && (
          <div className="space-y-4">
            {testCases.map((tc, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] overflow-hidden">
                <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                    Example {i + 1}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest block mb-1">Input</span>
                    <pre className="text-xs text-emerald-300 bg-black/30 border border-white/[0.05] rounded-lg p-2 overflow-x-auto font-mono">
                      {JSON.stringify(tc.input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest block mb-1">Expected</span>
                    <pre className="text-xs text-cyan-300 bg-black/30 border border-white/[0.05] rounded-lg p-2 overflow-x-auto font-mono">
                      {JSON.stringify(tc.expected, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
