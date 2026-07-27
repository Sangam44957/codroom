"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import OtpInput from "@/components/ui/OtpInput";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp]           = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!email) { setError("Invalid reset link. Go back and request a new code."); return; }
    timerRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [email]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (otp.length !== 6) { setError("Enter the 6-digit code"); return; }
    if (!password)        { setError("Password is required"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Minimum 8 characters"); return; }
    if (!/[A-Z]/.test(password)) { setError("Must include an uppercase letter"); return; }
    if (!/[0-9]/.test(password)) { setError("Must include a number"); return; }

    setLoading(true); setError("");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending || countdown > 0) return;
    setResending(true); setResendMsg(""); setError("");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      setResendMsg("New code sent! Check your inbox.");
      setOtp("");
      setCountdown(60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
      }, 1000);
    } catch {
      setError("Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
      {success ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Password updated!</h2>
          <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">🔐</div>
            <h2 className="text-xl font-bold text-white mb-1">Reset your password</h2>
            <p className="text-slate-500 text-sm">
              Enter the code sent to{" "}
              <span className="text-violet-400 font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OTP */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3 text-center">Verification Code</label>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all"
                />
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="password" value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-400 text-sm text-center">{error}</p>
              </div>
            )}

            {resendMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-emerald-400 text-sm text-center">{resendMsg}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-40"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><ArrowRight size={16} /> Update Password</>
              }
            </button>
          </form>

          <div className="text-center mt-5">
            <p className="text-slate-500 text-sm">
              Didn&apos;t receive it?{" "}
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
            <p className="text-slate-600 text-xs mt-2">Code expires in 10 minutes</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 text-slate-500 text-center text-sm">Loading…</div>}>
          <ResetForm />
        </Suspense>
        <p className="text-center mt-4 text-slate-600 text-sm">
          <Link href="/login" className="hover:text-slate-400 transition-colors">← Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
