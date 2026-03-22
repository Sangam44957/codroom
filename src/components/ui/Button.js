"use client";

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
  const base = "rounded-xl font-semibold flex items-center justify-center transition-all duration-200 active:scale-[0.97] cursor-pointer btn-press";

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 hover:-translate-y-0.5",
    secondary:
      "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16]",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 hover:shadow-rose-500/40 hover:-translate-y-0.5",
    ghost:
      "bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-white",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${
        disabled || loading ? "!opacity-40 !cursor-not-allowed !shadow-none !translate-y-0" : ""
      }`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {loading ? "Please wait…" : children}
    </button>
  );
}
