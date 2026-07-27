"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const CODE_LINES = [
  { n: 1,  text: "function findMedianSortedArrays(",      type: "neutral" },
  { n: 2,  text: "  nums1: number[], nums2: number[]",    type: "neutral" },
  { n: 3,  text: "): number {",                           type: "neutral" },
  { n: 4,  text: "  // brute force merge + sort",         type: "remove"  },
  { n: 5,  text: "  const merged = [...nums1, ...nums2]", type: "remove"  },
  { n: 6,  text: "    .sort((a, b) => a - b);",           type: "remove"  },
  { n: 7,  text: "  // binary search — O(log(m+n))",      type: "add"     },
  { n: 8,  text: "  let lo = 0, hi = nums1.length;",      type: "add"     },
  { n: 9,  text: "  while (lo <= hi) {",                  type: "add"     },
  { n: 10, text: "    const i = (lo + hi) >> 1;",         type: "add"     },
  { n: 11, text: "    const j = half - i;",               type: "add"     },
  { n: 12, text: "    if (nums1[i] < nums2[j - 1])",      type: "add"     },
  { n: 13, text: "      lo = i + 1;",                     type: "add"     },
  { n: 14, text: "    else hi = i - 1;",                  type: "add"     },
  { n: 15, text: "  }",                                   type: "neutral" },
  { n: 16, text: "}",                                     type: "neutral" },
];

const METRICS = [
  { label: "CORRECTNESS",  value: 92, pct: 0.92 },
  { label: "CODE QUALITY", value: 88, pct: 0.88 },
  { label: "EDGE CASES",   value: 74, pct: 0.74 },
  { label: "OPTIMIZATION", value: 96, pct: 0.96 },
];

const CIRC = 220;

function ScoreRing({ progress }) {
  const offset = useTransform(progress, [0, 1], [CIRC, CIRC - (87 / 100) * CIRC]);
  const score  = useTransform(progress, [0, 1], [0, 87]);
  return (
    <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle
          cx="40" cy="40" r="30"
          fill="none"
          stroke="#3fb950"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.div className="text-xl font-bold text-white font-mono leading-none">
          {useTransform(score, Math.round)}
        </motion.div>
        <div className="text-[8px] text-white/35 font-mono tracking-widest mt-0.5">SCORE</div>
      </div>
    </div>
  );
}

export default function DiffScrollMockup() {
  const containerRef = useRef(null);

  // Track scroll through the sticky container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Mockup scale: starts slightly small, reaches full at 30% scroll
  const scale   = useTransform(scrollYProgress, [0, 0.25], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0.5, 1]);

  // Diff lines reveal: 10% → 55% scroll
  const linesProgress = useTransform(scrollYProgress, [0.1, 0.55], [0, CODE_LINES.length]);

  // Report panel: fades in 40% → 65%
  const reportProgress = useTransform(scrollYProgress, [0.4, 0.7], [0, 1]);
  const reportY        = useTransform(scrollYProgress, [0.4, 0.7], [20, 0]);

  // Verdict: 55% → 70%
  const verdictProgress = useTransform(scrollYProgress, [0.55, 0.72], [0, 1]);

  // Metric bars driven by reportProgress
  const metricWidths = METRICS.map((m) =>
    useTransform(reportProgress, [0, 1], ["0%", `${m.pct * 100}%`])
  );

  return (
    // h-[180vh] gives enough scroll room without a huge dead zone
    <div ref={containerRef} className="relative h-[180vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center px-4 py-8">
        <motion.div style={{ scale, opacity }} className="w-full max-w-5xl">

          {/* Glass chrome */}
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: "rgba(13,15,18,0.75)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset",
            }}
          >
            {/* Top light catch */}
            <div
              className="absolute inset-x-0 top-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
            />

            {/* Title bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,11,13,0.6)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {["rgba(229,83,75,0.7)", "rgba(255,189,46,0.7)", "rgba(63,185,80,0.7)"].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <span className="font-mono text-[11px] text-white/30">solution.ts</span>
                <span className="font-mono text-[10px] text-white/15">·</span>
                <span className="font-mono text-[10px] text-white/20">Interview Session</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-white/20">ID: INT-2024-0815-001</span>
                <span className="font-mono text-[10px] text-white/20">00:41:18</span>
                <button
                  className="font-mono text-[10px] px-2.5 py-1 rounded-md"
                  style={{ border: "1px solid rgba(229,83,75,0.35)", color: "#e5534b", background: "rgba(229,83,75,0.06)" }}
                >
                  END SESSION
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-2" style={{ minHeight: "400px" }}>

              {/* Left — code editor */}
              <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                <div
                  className="px-4 py-2 flex items-center gap-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}
                >
                  <span className="font-mono text-[10px] text-white/25">TypeScript</span>
                  <span className="font-mono text-[10px] text-white/12">·</span>
                  <span className="font-mono text-[10px] text-white/25">findMedianSortedArrays</span>
                </div>

                <div className="p-4 font-mono text-[11.5px] leading-[1.65]">
                  {CODE_LINES.map((line, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-2.5"
                      style={{
                        opacity: useTransform(linesProgress, (v) => Math.min(1, Math.max(0, v - i))),
                        x: useTransform(linesProgress, (v) => (v > i ? 0 : -6)),
                      }}
                    >
                      <span className="w-5 text-right shrink-0 select-none" style={{ color: "rgba(255,255,255,0.12)" }}>
                        {line.n}
                      </span>
                      <span
                        className="w-3 shrink-0 select-none font-bold"
                        style={{
                          color:
                            line.type === "add" ? "#3fb950" :
                            line.type === "remove" ? "#e5534b" :
                            "transparent",
                        }}
                      >
                        {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                      </span>
                      <span
                        style={{
                          color:
                            line.type === "add" ? "rgba(63,185,80,0.85)" :
                            line.type === "remove" ? "rgba(229,83,75,0.55)" :
                            "rgba(230,230,230,0.7)",
                          textDecoration: line.type === "remove" ? "line-through" : "none",
                          textDecorationColor: "rgba(229,83,75,0.4)",
                          background:
                            line.type === "add" ? "rgba(63,185,80,0.06)" :
                            line.type === "remove" ? "rgba(229,83,75,0.05)" :
                            "transparent",
                          display: "block",
                          width: "100%",
                          paddingLeft: "4px",
                          borderRadius: "2px",
                        }}
                      >
                        {line.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right — AI report */}
              <motion.div
                style={{ opacity: reportProgress, y: reportY }}
                className="p-5 flex flex-col gap-4"
              >
                {/* Verdict */}
                <motion.div style={{ opacity: verdictProgress }} className="flex items-center gap-2.5">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] font-semibold"
                    style={{
                      background: "rgba(63,185,80,0.1)",
                      border: "1px solid rgba(63,185,80,0.3)",
                      color: "#3fb950",
                      boxShadow: "0 0 12px rgba(63,185,80,0.15)",
                    }}
                  >
                    <span>+</span>
                    <span>STRONG HIRE</span>
                  </div>
                  <span className="font-mono text-[9px] text-white/25 tracking-widest">AI EVALUATION</span>
                </motion.div>

                {/* Score + metrics */}
                <div className="flex items-start gap-4">
                  <ScoreRing progress={reportProgress} />
                  <div className="flex-1 space-y-2.5 pt-0.5">
                    {METRICS.map((m, i) => (
                      <div key={m.label}>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-[9px] text-white/35 tracking-widest">{m.label}</span>
                          <span className="font-mono text-[9px] text-white/50">{m.value}</span>
                        </div>
                        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: "linear-gradient(90deg, #3fb950, rgba(63,185,80,0.6))",
                              width: metricWidths[i],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complexity */}
                <div
                  className="rounded-lg p-3 font-mono text-[10.5px] space-y-1.5"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-[8px] text-white/25 tracking-widest mb-2">COMPLEXITY ANALYSIS</div>
                  {[
                    ["TIME",    "O(LOG(M+N))", true],
                    ["SPACE",   "O(1)",         true],
                    ["MEMORY",  "14.2 MB",      false],
                    ["RUNTIME", "128 ms",       false],
                  ].map(([k, v, green]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-white/35">{k}</span>
                      <span style={{ color: green ? "#3fb950" : "rgba(255,255,255,0.55)" }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="font-mono text-[8px] text-white/22 tracking-widest mb-1.5">AI FEEDBACK</div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Optimal binary search approach. Correctly handles edge cases for empty arrays and odd/even total lengths.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Terminal bar */}
            <div
              className="flex items-center gap-3 px-5 py-2.5 font-mono text-[10px]"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,11,13,0.5)" }}
            >
              <span className="text-white/22">TERMINAL</span>
              <span className="text-white/12">·</span>
              <span className="text-white/30">INFO  Code compiled successfully  14:32:18</span>
              <span className="text-white/12">·</span>
              <span style={{ color: "#3fb950" }}>● ALL TESTS PASSED  12/12</span>
              <div className="ml-auto">
                <button
                  className="px-3 py-1 rounded font-mono text-[10px] transition-colors"
                  style={{
                    background: "rgba(63,185,80,0.08)",
                    border: "1px solid rgba(63,185,80,0.25)",
                    color: "#3fb950",
                  }}
                >
                  RUN CODE
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
