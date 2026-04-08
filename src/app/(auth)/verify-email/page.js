"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function OtpInput({ value, onChange, disabled }) {
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
    if (pasted.length === 6) {
      onChange(pasted);
      inputs.current[5]?.focus();
    }
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

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [email] = useState(emailFromQuery);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (otp.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/login?verified=1");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6) handleSubmit();
  }, [otp]);

  async function handleResend() {
    if (resending || countdown > 0) return;
    setResending(true); setResendMsg(""); setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMsg("New code sent! Check your inbox.");
        setOtp("");
        setCountdown(60);
        timerRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) { clearInterval(timerRef.current); return 0; }
            return c - 1;
          });
        }, 1000);
      } else {
        setError(data.error || "Failed to resend. Try again.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#04040f] flex items-center justify-center px-4">
      <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-lg font-black text-white group-hover:scale-110 transition-transform">C</div>
            <span className="text-3xl font-black text-white tracking-tight">CodRoom</span>
          </Link>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl">📧</div>
            <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-slate-500 text-sm">
              We sent a 6-digit code to<br />
              <span className="text-violet-400 font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-400 text-sm text-center">{error}</p>
              </div>
            )}

            {resendMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-emerald-400 text-sm text-center">{resendMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify Email"}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-slate-500 text-sm">
              Didn't receive it?{" "}
              {countdown > 0 ? (
                <span className="text-slate-600">Resend in {countdown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-violet-400 hover:text-violet-300 font-semibold disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend code"}
                </button>
              )}
            </p>
          </div>

          <p className="text-slate-600 text-xs text-center mt-4">
            Code expires in 10 minutes
          </p>
        </div>

        <p className="text-center mt-4 text-slate-600 text-sm">
          <Link href="/login" className="hover:text-slate-400 transition-colors">← Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04040f]" />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
