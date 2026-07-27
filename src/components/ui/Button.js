"use client";

import { motion } from "framer-motion";

const SPRING = { type: "spring", stiffness: 400, damping: 25 };

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

const variants = {
  primary: { cls: "text-white shadow-lg shadow-violet-600/25", style: { background: "var(--accent-gradient)" } },
  secondary: { cls: "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16]", style: {} },
  danger: { cls: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25", style: {} },
  ghost: { cls: "bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-white", style: {} },
  success: { cls: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25", style: {} },
  glass: { cls: "glass-panel text-white", style: {} },
};

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  fullWidth = false,
  disabled = false,
  loading = false,
  size = "md",
}) {
  const v = variants[variant] ?? variants.primary;
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      transition={SPRING}
      style={v.style}
      className={`rounded-[var(--radius-md)] font-semibold flex items-center justify-center cursor-pointer ${
        sizes[size]
      } ${v.cls} ${fullWidth ? "w-full" : ""} ${
        disabled || loading ? "!opacity-40 !cursor-not-allowed !shadow-none" : ""
      }`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {loading ? "Please wait…" : children}
    </motion.button>
  );
}
