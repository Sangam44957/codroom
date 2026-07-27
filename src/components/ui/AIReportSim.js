"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, TrendingUp, Zap, Share2 } from "lucide-react";

const SUMMARY_TEXT =
  "Optimal O(n) hash-map solution. Clean variable naming, handles all edge cases including duplicates. Would perform well in a production codebase.";

const SCORES = [
  { label: "Correctness",  value: 9, color: "#00E87B", delay: 0.6 },
  { label: "Code Quality", value: 9, color: "#22D3EE", delay: 0.8 },
  { label: "Edge Cases",   value: 8, color: "#6366F1", delay: 1.0 },
];

function ScoreBar({ label, value, color, animate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-white/40">{label}</span>
        <span className="text-[11px] font-bold text-white">{value}/10</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: animate ? `${value * 10}%` : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function AIReportSim() {
  const [phase, setPhase] = useState(0);
  // phase 0 = generating, 1 = verdict appears, 2 = scores, 3 = summary streams, 4 = share prompt

  useEffect(() => {
    const timings = [1400, 800, 1200, 2400];
    let current = 0;
    const advance = () => {
      current++;
      setPhase(current);
      if (current < timings.length) {
        setTimeout(advance, timings[current]);
      }
    };
    const t = setTimeout(advance, timings[0]);
    return () => clearTimeout(t);
  }, []);

  // restart loop
  useEffect(() => {
    if (phase < 4) return;
    const t = setTimeout(() => setPhase(0), 4000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div
      className="w-full rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
      style={{ background: "#0F0F14" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#1A1A2A]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#00E87B]/10 border border-[#00E87B]/20 flex items-center justify-center text-[10px]">
            🤖
          </div>
          <span className="text-[11px] font-semibold text-white/60 font-mono">AI Report</span>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#00E87B]"
            animate={{ opacity: phase === 0 ? [1, 0.2, 1] : 1 }}
            transition={{ duration: 1, repeat: phase === 0 ? Infinity : 0 }}
          />
          <span className="text-[10px] font-mono text-white/30">
            {phase === 0 ? "analyzing…" : "complete"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 min-h-[320px]">
        {/* Generating skeleton */}
        <AnimatePresence>
          {phase === 0 && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 pt-2"
            >
              {[80, 60, 90, 50].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-2.5 rounded-full bg-white/[0.06]"
                  style={{ width: `${w}%` }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
              <div className="flex items-center gap-2 pt-2">
                <div className="w-4 h-4 border-2 border-[#00E87B]/30 border-t-[#00E87B] rounded-full animate-spin" />
                <span className="text-[11px] text-white/30 font-mono">Groq LLM evaluating code…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verdict */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-between p-3 rounded-xl border border-[#00E87B]/20 bg-[#00E87B]/[0.06]"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-[#00E87B] flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">AI Suggestion</p>
                  <p className="text-base font-black text-[#00E87B] leading-tight">Strong Hire</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">87</p>
                <p className="text-[10px] text-white/30">/ 100</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complexity pills */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              key="complexity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2"
            >
              {[
                { label: "Time", value: "O(n)", color: "#22D3EE" },
                { label: "Space", value: "O(n)", color: "#6366F1" },
                { label: "Tests", value: "3/3 ✓", color: "#00E87B" },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex-1 rounded-lg px-2 py-1.5 text-center border"
                  style={{ backgroundColor: p.color + "10", borderColor: p.color + "25" }}
                >
                  <p className="text-[10px] font-bold" style={{ color: p.color }}>{p.value}</p>
                  <p className="text-[9px] text-white/30 mt-0.5">{p.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score bars */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              key="scores"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={11} className="text-violet-400" />
                <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Performance</span>
              </div>
              {SCORES.map((s) => (
                <ScoreBar key={s.label} {...s} animate={phase >= 2} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary streaming */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={11} className="text-[#22D3EE]" />
                <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Summary</span>
              </div>
              <StreamingText text={SUMMARY_TEXT} active={phase === 3} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share prompt */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.button
              key="share"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs text-white transition-all"
              style={{ background: "linear-gradient(135deg,#00E87B22,#22D3EE22)", border: "1px solid rgba(0,232,123,0.2)" }}
            >
              <Share2 size={12} className="text-[#00E87B]" />
              <span className="text-white/60">Share with hiring committee</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StreamingText({ text, active }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
  }, [text]);

  useEffect(() => {
    if (!active || shown >= text.length) return;
    const t = setTimeout(() => setShown((p) => p + 1), 18);
    return () => clearTimeout(t);
  }, [active, shown, text]);

  // show full text once phase moves past 3
  const display = active ? text.slice(0, shown) : text;

  return (
    <p className="text-[11px] text-white/40 leading-relaxed">
      {display}
      {active && shown < text.length && (
        <motion.span
          className="inline-block w-[2px] h-3 bg-[#22D3EE] ml-px align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </p>
  );
}
