"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock, ChevronDown, ChevronUp, X } from "lucide-react";

export default function SecurityWarning({ warningCount, isLocked, onDismiss }) {
  const [expanded, setExpanded] = useState(false);

  // Hard lock screen — replaces the entire UI
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#04040f] flex items-center justify-center">
        <div className="ambient-orbs">
          <div className="orb orb-violet" />
          <div className="orb orb-cyan" />
        </div>
        <div className="relative z-10 text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Lock size={28} className="text-rose-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Session Locked</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Too many security violations were detected. The interviewer has been
            notified and can unlock your session.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-slate-600 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Waiting for interviewer to unlock...
          </div>
          <p className="text-slate-700 text-xs mt-3">
            {warningCount} violations recorded
          </p>
        </div>
      </div>
    );
  }

  if (!warningCount) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="fixed top-12 right-4 z-[999] w-64"
      >
        {/* Collapsed pill — always visible */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#0d0b1a]/90 border border-rose-500/25 shadow-lg cursor-pointer select-none"
          style={{ backdropFilter: "blur(16px)" }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-rose-400 flex-shrink-0" />
            <span className="text-rose-300 text-xs font-semibold">
              {warningCount} warning{warningCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {expanded ? (
              <ChevronUp size={11} className="text-slate-500" />
            ) : (
              <ChevronDown size={11} className="text-slate-500" />
            )}
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div
                className="mt-1 rounded-xl border border-rose-500/20 bg-[#0d0b1a]/90 px-4 py-3 shadow-xl"
                style={{ backdropFilter: "blur(16px)" }}
              >
                <p className="text-slate-400 text-xs leading-relaxed">
                  Suspicious activity was detected. Your interviewer has been
                  notified. Stay on this tab and keep fullscreen active.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                    onDismiss?.();
                  }}
                  className="mt-3 w-full px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold rounded-lg transition-all"
                >
                  I understand
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
