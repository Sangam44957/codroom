"use client";

export default function Input({ label, type = "text", placeholder, value, onChange, error }) {
  return (
    <div className="mb-5">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-3.5 bg-white/[0.03] border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all duration-200 ${
          error
            ? "border-rose-500/40 focus:ring-rose-500/20 focus:border-rose-500/60"
            : "border-white/[0.06] hover:border-white/[0.12] focus:ring-violet-500/30 focus:border-violet-500/60"
        }`}
      />
      {error && (
        <p className="text-rose-400 text-xs mt-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
