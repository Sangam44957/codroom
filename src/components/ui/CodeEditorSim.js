"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEGMENTS = [
  { text: "// 🚀 Two Sum — Collaborative Solution\n\n", color: "#6A9955" },
  { text: "function ", color: "#C586C0" },
  { text: "twoSum", color: "#DCDCAA" },
  { text: "(", color: "#FFD700" },
  { text: "nums", color: "#9CDCFE" },
  { text: ": ", color: "#D4D4D4" },
  { text: "number[]", color: "#4EC9B0" },
  { text: ", ", color: "#D4D4D4" },
  { text: "target", color: "#9CDCFE" },
  { text: ": ", color: "#D4D4D4" },
  { text: "number", color: "#4EC9B0" },
  { text: ") {\n", color: "#D4D4D4" },
  { text: "  ", color: "#D4D4D4" },
  { text: "const ", color: "#569CD6" },
  { text: "map ", color: "#9CDCFE" },
  { text: "= ", color: "#D4D4D4" },
  { text: "new ", color: "#569CD6" },
  { text: "Map", color: "#4EC9B0" },
  { text: "();\n\n", color: "#D4D4D4" },
  { text: "  ", color: "#D4D4D4" },
  { text: "for ", color: "#C586C0" },
  { text: "(", color: "#FFD700" },
  { text: "let ", color: "#569CD6" },
  { text: "i ", color: "#9CDCFE" },
  { text: "= ", color: "#D4D4D4" },
  { text: "0", color: "#B5CEA8" },
  { text: "; i < nums.length; i++", color: "#D4D4D4" },
  { text: ") {\n", color: "#D4D4D4" },
  { text: "    ", color: "#D4D4D4" },
  { text: "const ", color: "#569CD6" },
  { text: "comp ", color: "#9CDCFE" },
  { text: "= target - nums[i];\n", color: "#D4D4D4" },
  { text: "    ", color: "#D4D4D4" },
  { text: "if ", color: "#C586C0" },
  { text: "(map.has(comp)) ", color: "#D4D4D4" },
  { text: "return ", color: "#C586C0" },
  { text: "[map.get(comp), i];\n", color: "#D4D4D4" },
  { text: "    map.set(nums[i], i);\n", color: "#D4D4D4" },
  { text: "  }\n}\n\n", color: "#D4D4D4" },
  { text: "// Test it!\n", color: "#6A9955" },
  { text: "console", color: "#9CDCFE" },
  { text: ".log", color: "#DCDCAA" },
  { text: "(twoSum([", color: "#D4D4D4" },
  { text: "2,7,11,15", color: "#B5CEA8" },
  { text: "], ", color: "#D4D4D4" },
  { text: "9", color: "#B5CEA8" },
  { text: "));", color: "#D4D4D4" },
];

const OUTPUT_LINES = [
  { text: "$ codroom run solution.ts", color: "#6A9955" },
  { text: "Compiling TypeScript...", color: "#9CDCFE" },
  { text: "Running tests...", color: "#9CDCFE" },
  { text: "", color: "#D4D4D4" },
  { text: "  ✓ twoSum([2,7,11,15], 9) → [0, 1]", color: "#00E87B" },
  { text: "  ✓ twoSum([3,2,4], 6)     → [1, 2]", color: "#00E87B" },
  { text: "  ✓ twoSum([3,3], 6)       → [0, 1]", color: "#00E87B" },
  { text: "", color: "#D4D4D4" },
  { text: "All 3 tests passed ✓", color: "#00E87B" },
];

export default function CodeEditorSim() {
  const [revealed, setRevealed] = useState(0);
  const [showOutput, setShowOutput] = useState(false);
  const [outputLines, setOutputLines] = useState(0);
  const editorRef = useRef(null);

  const chars = useMemo(() =>
    SEGMENTS.flatMap((seg) => seg.text.split("").map((char) => ({ char, color: seg.color }))),
  []);

  const done = revealed >= chars.length;

  // Type characters
  useEffect(() => {
    if (done) return;
    const delay = Math.random() * 18 + 12;
    const t = setTimeout(() => setRevealed((p) => p + 1), delay);
    return () => clearTimeout(t);
  }, [revealed, done]);

  // Show output after done
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setShowOutput(true), 500);
    return () => clearTimeout(t);
  }, [done]);

  // Reveal output lines one at a time
  useEffect(() => {
    if (!showOutput || outputLines >= OUTPUT_LINES.length) return;
    const t = setTimeout(
      () => setOutputLines((p) => p + 1),
      outputLines === 0 ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [showOutput, outputLines]);

  // Auto-scroll
  useEffect(() => {
    if (editorRef.current) editorRef.current.scrollTop = editorRef.current.scrollHeight;
  }, [revealed]);

  const lineCount = (chars.slice(0, revealed).map((c) => c.char).join("").match(/\n/g) || []).length + 1;

  return (
    <div className="editor-chrome w-full shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#1A1A2A]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-xs text-white/30 font-mono">solution.ts</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[["A", "#00E87B"], ["S", "#6366F1"]].map(([letter, color]) => (
              <div key={letter} className="w-5 h-5 rounded-full border border-[#1A1A2A] flex items-center justify-center" style={{ backgroundColor: color + "30" }}>
                <span className="text-[8px] font-bold" style={{ color }}>{letter}</span>
              </div>
            ))}
          </div>
          <motion.div className="w-1.5 h-1.5 rounded-full bg-[#00E87B]" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          <span className="text-[10px] text-white/30 font-mono">2 online</span>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex">
        {/* Line numbers */}
        <div className="py-4 px-3 text-right select-none border-r border-white/[0.04] bg-[#1A1A2A]/50 min-w-[44px]">
          {Array.from({ length: Math.max(lineCount, 18) }).map((_, i) => (
            <div key={i} className={`text-[11px] leading-[1.6rem] font-mono ${i < lineCount ? "text-white/20" : "text-white/[0.06]"}`}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code */}
        <div ref={editorRef} className="flex-1 py-4 px-4 overflow-hidden max-h-[340px] relative">
          <pre className="text-[12.5px] leading-[1.6rem] font-mono whitespace-pre-wrap break-words">
            {chars.slice(0, revealed).map((c, i) => (
              <span key={i} style={{ color: c.color }}>{c.char}</span>
            ))}
            {!done && (
              <motion.span
                className="inline-block w-[2px] h-[14px] bg-[#00E87B] ml-px align-middle"
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </pre>

          {/* Second cursor */}
          {revealed > 60 && revealed < chars.length && (
            <motion.div
              className="absolute pointer-events-none"
              animate={{ top: ["38%", "32%", "48%"], left: ["58%", "52%", "62%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-[2px] h-4 bg-[#6366F1]" />
              <div className="absolute -top-5 left-0 bg-[#6366F1] text-[9px] text-white px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                Sam K.
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Terminal */}
      <AnimatePresence>
        {showOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="border-t border-white/[0.06]"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A2A]/60 border-b border-white/[0.04]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00E87B" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span className="text-[10px] font-mono text-white/30">TERMINAL</span>
            </div>
            <div className="px-4 py-3 bg-[#0D0D16] max-h-[160px] overflow-hidden">
              {OUTPUT_LINES.slice(0, outputLines).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-[11.5px] leading-[1.5rem]"
                  style={{ color: line.color }}
                >
                  {line.text || "\u00A0"}
                </motion.div>
              ))}
              {outputLines < OUTPUT_LINES.length && (
                <motion.span className="inline-block w-2 h-3 bg-[#00E87B]/60" animate={{ opacity: [1, 0] }} transition={{ duration: 0.7, repeat: Infinity }} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
