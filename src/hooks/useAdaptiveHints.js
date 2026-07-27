"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Thresholds
const FAILED_RUNS_THRESHOLD = 3;       // consecutive failed runs
const IDLE_THRESHOLD_MS = 3 * 60_000; // 3 min without code change
const HINT_COOLDOWN_MS = 2 * 60_000;  // min gap between hints

const HINTS = {
  consecutive_failures: [
    "Try adding a few console.log / print statements to inspect intermediate values.",
    "Break the problem into smaller sub-functions and test each one independently.",
    "Check edge cases: empty input, single element, negative numbers.",
  ],
  long_idle: [
    "Stuck? Try explaining your approach out loud — it often reveals the next step.",
    "Consider a brute-force solution first, then optimise.",
    "Look at the examples again — the pattern is often hidden in the test cases.",
  ],
};

function pickHint(type, usedRef) {
  const pool = HINTS[type];
  const unused = pool.filter((_, i) => !usedRef.current[type]?.has(i));
  if (!unused.length) return null;
  const idx = pool.indexOf(unused[Math.floor(Math.random() * unused.length)]);
  if (!usedRef.current[type]) usedRef.current[type] = new Set();
  usedRef.current[type].add(idx);
  return pool[idx];
}

/**
 * useAdaptiveHints
 *
 * @param {object} opts
 * @param {boolean}  opts.enabled          - only active when interviewer enables hints
 * @param {object}   opts.output           - latest code execution output
 * @param {string}   opts.code             - current editor code
 * @param {string}   opts.interviewStatus  - "waiting" | "in_progress" | "completed"
 *
 * @returns {{ hint: string|null, dismissHint: () => void }}
 */
export function useAdaptiveHints({ enabled, output, code, interviewStatus }) {
  const [hint, setHint] = useState(null);
  const consecutiveFailsRef = useRef(0);
  const lastCodeChangeRef   = useRef(Date.now());
  const lastHintTimeRef     = useRef(0);
  const usedHintsRef        = useRef({});
  const idleTimerRef        = useRef(null);

  const maybeShowHint = useCallback((type) => {
    if (!enabled || interviewStatus !== "in_progress") return;
    const now = Date.now();
    if (now - lastHintTimeRef.current < HINT_COOLDOWN_MS) return;
    const text = pickHint(type, usedHintsRef);
    if (!text) return;
    lastHintTimeRef.current = now;
    setHint(text);
  }, [enabled, interviewStatus]);

  // Track consecutive failures
  useEffect(() => {
    if (!output) return;
    if (output.status === "error") {
      consecutiveFailsRef.current += 1;
      if (consecutiveFailsRef.current >= FAILED_RUNS_THRESHOLD) {
        maybeShowHint("consecutive_failures");
        consecutiveFailsRef.current = 0;
      }
    } else {
      consecutiveFailsRef.current = 0;
    }
  }, [output, maybeShowHint]);

  // Track idle time (no code changes)
  useEffect(() => {
    lastCodeChangeRef.current = Date.now();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!enabled || interviewStatus !== "in_progress") return;
    idleTimerRef.current = setTimeout(() => {
      maybeShowHint("long_idle");
    }, IDLE_THRESHOLD_MS);
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [code, enabled, interviewStatus, maybeShowHint]);

  const dismissHint = useCallback(() => setHint(null), []);

  return { hint, dismissHint };
}
