"use client";

export default function Input({ label, type = "text", placeholder, value, onChange, error }) {
  return (
    <div className="mb-5">
      {label && (
        <label
          className="block mb-2 text-[var(--text-caption)] text-slate-300"
          style={{ fontWeight: "var(--weight-medium)" }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-3.5 bg-[var(--glass-bg)] border rounded-[var(--radius-md)] text-white placeholder-slate-600 focus:outline-none transition-all duration-200 ${
          error
            ? "border-rose-500/40 focus:border-rose-500/60"
            : "border-[var(--glass-border)] hover:border-white/[0.14] focus:border-[var(--accent-from)]"
        }`}
        style={{
          backdropFilter: "blur(var(--glass-blur))",
          boxShadow: error
            ? undefined
            : "var(--input-focus-shadow, none)",
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.18)";
        }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
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
