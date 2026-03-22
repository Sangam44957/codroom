"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ open, title, description, onConfirm, onCancel, loading }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-[#0d0b1a]/90 border border-white/[0.09] rounded-2xl p-7 shadow-2xl shadow-black/60"
            style={{ backdropFilter: "blur(24px)" }}
          >
            {/* Icon */}
            <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle size={22} className="text-rose-400" />
            </div>

            <h2 className="text-white font-bold text-lg text-center mb-2">{title}</h2>
            <p className="text-slate-400 text-sm text-center leading-relaxed mb-7">{description}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
