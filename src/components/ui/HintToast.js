"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";

export default function HintToast({ hint, onDismiss }) {
  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[990] w-full max-w-sm px-4"
        >
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/25 bg-[#0d0b1a]/90 shadow-xl"
            style={{ backdropFilter: "blur(16px)" }}
          >
            <Lightbulb size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed flex-1">{hint}</p>
            <button
              onClick={onDismiss}
              className="text-slate-600 hover:text-white transition-colors flex-shrink-0"
              aria-label="Dismiss hint"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
