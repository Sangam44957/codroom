"use client";

import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CollabIndicator({ collabMode }) {
  return (
    <AnimatePresence>
      {collabMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-cyan-500/10 border-b border-cyan-500/20 flex-shrink-0"
        >
          <Users size={12} className="text-cyan-400" />
          <span className="text-xs text-cyan-300 font-medium">Collaborative editing active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
