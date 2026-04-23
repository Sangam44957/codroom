"use client";

import { useRef } from "react";

export default function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  function handleChange(i, e) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[i] = val;
    onChange(next.join(""));
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { onChange(pasted); inputs.current[5]?.focus(); }
    e.preventDefault();
  }

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-white/[0.04] text-white transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 disabled:opacity-40 ${
            value[i] ? "border-violet-500/50" : "border-white/[0.08]"
          }`}
        />
      ))}
    </div>
  );
}
