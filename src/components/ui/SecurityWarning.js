"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock } from "lucide-react";

export default function SecurityWarning({ warningCount, isLocked, onDismiss }) {
  // Hard lock screen — replaces the entire UI
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#04040f] flex items-center justify-center">
        <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
        <div className="relative z-10 text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Lock size={28} className="text-rose-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Session Locked</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Too many security violations were detected. The interviewer has been notified and can unlock your session.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-slate-600 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Waiting for interviewer to unlock...
          </div>
          <p className="text-slate-700 text-xs mt-3">{warningCount} violations recorded</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {warningCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-full max-w-sm px-4"
        >
          <div
            className="relative rounded-2xl border border-rose-500/25 bg-[#0d0b1a]/90 px-5 py-4 shadow-2xl shadow-black/60"
            style={{ backdropFilter: "blur(24px)" }}
          >
            <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle size={15} className="text-rose-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-rose-300 font-bold text-sm">Warning #{warningCount}</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Suspicious activity detected. The interviewer has been notified.
                  Stay on this tab and keep fullscreen mode active.
                </p>
                <button
                  onClick={onDismiss}
                  className="mt-3 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 text-xs font-semibold rounded-lg transition-all"
                >
                  I understand
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
