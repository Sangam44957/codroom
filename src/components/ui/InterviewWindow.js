"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";

const CODE = [
  { n: 1,  t: "function findMedian(nums1, nums2) {",  c: "fn"      },
  { n: 2,  t: "  const merged = merge(nums1, nums2);", c: "normal"  },
  { n: 3,  t: "  const mid = merged.length >> 1;",     c: "normal"  },
  { n: 4,  t: "",                                       c: "empty"   },
  { n: 5,  t: "  if (merged.length % 2 === 0) {",      c: "normal"  },
  { n: 6,  t: "    return (merged[mid-1] +",            c: "add"     },
  { n: 7,  t: "      merged[mid]) / 2;",                c: "add"     },
  { n: 8,  t: "  }",                                    c: "normal"  },
  { n: 9,  t: "  return merged[mid];",                  c: "normal"  },
  { n: 10, t: "}",                                      c: "fn"      },
];

const COLOR = {
  fn:     "rgba(180,160,255,0.9)",
  normal: "rgba(220,220,240,0.7)",
  add:    "rgba(100,220,160,0.9)",
  empty:  "transparent",
};

export default function InterviewWindow() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (clientX - cx) / (rect.width  / 2);
      const dy   = (clientY - cy) / (rect.height / 2);
      setTilt({ x: dy * -6, y: dx * 6 });
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.92 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
      }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Glow bloom behind the window */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(120,80,255,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
          transform: "translateZ(-1px)",
        }}
      />

      {/* The window */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.15) inset",
        }}
      >
        {/* Top edge highlight */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none z-10"
          style={{ background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.25) 50%, transparent 95%)" }}
        />

        {/* Window chrome */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,96,89,0.8)"  }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,189,46,0.8)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(40,200,64,0.8)"  }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono, monospace)" }}>
              codRoom — Interview Session
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono, monospace)" }}>
              ID: INT-2024-0815
            </span>
            <div
              className="px-2.5 py-1 rounded-md text-[11px] font-medium"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              00:41:18
            </div>
          </div>
        </div>

        {/* Body — split layout */}
        <div className="grid grid-cols-5" style={{ minHeight: "340px" }}>

          {/* Code editor — 3 cols */}
          <div
            className="col-span-3 p-5"
            style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-4">
              <div
                className="px-3 py-1 rounded-md text-[11px]"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                solution.ts
              </div>
              <div className="text-[11px] px-2" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono, monospace)" }}>
                +
              </div>
            </div>

            {/* Code */}
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", lineHeight: "1.7" }}>
              {CODE.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-3"
                >
                  <span className="w-5 text-right shrink-0 select-none" style={{ color: "rgba(255,255,255,0.15)" }}>
                    {line.n}
                  </span>
                  <span style={{ color: COLOR[line.c] }}>{line.t}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI panel — 2 cols */}
          <div className="col-span-2 flex flex-col">

            {/* Score */}
            <div
              className="p-4 flex items-center gap-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.7, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative flex items-center justify-center w-16 h-16 shrink-0"
              >
                <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <motion.circle
                    cx="32" cy="32" r="26"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="163"
                    initial={{ strokeDashoffset: 163 }}
                    animate={inView ? { strokeDashoffset: 22 } : {}}
                    transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-center">
                  <div className="text-lg font-bold" style={{ color: "#f0f0f5" }}>87</div>
                </div>
              </motion.div>

              <div>
                <div
                  className="text-[11px] font-semibold mb-0.5"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  Strong Hire
                </div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono, monospace)" }}>
                  AI EVALUATION
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="p-4 space-y-3 flex-1">
              {[
                { label: "Correctness",  v: 92, color: "#a78bfa" },
                { label: "Code Quality", v: 88, color: "#38bdf8" },
                { label: "Edge Cases",   v: 74, color: "#f472b6" },
              ].map((m, i) => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{m.label}</span>
                    <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{m.v}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: m.color }}
                      initial={{ width: "0%" }}
                      animate={inView ? { width: `${m.v}%` } : {}}
                      transition={{ delay: 0.9 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Complexity */}
            <div
              className="p-4"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              <div className="text-[9px] tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                COMPLEXITY
              </div>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: "rgba(255,255,255,0.35)" }}>TIME</span>
                <span style={{ color: "#a78bfa" }}>O(log n)</span>
              </div>
              <div className="flex justify-between text-[11px] mt-1">
                <span style={{ color: "rgba(255,255,255,0.35)" }}>SPACE</span>
                <span style={{ color: "#38bdf8" }}>O(1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal bar */}
        <div
          className="flex items-center gap-3 px-5 py-2.5"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.2)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.2)" }}>TERMINAL</span>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>Code compiled successfully</span>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.4 }}
            style={{ color: "rgba(100,220,160,0.9)" }}
          >
            ● ALL TESTS PASSED 12/12
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}
