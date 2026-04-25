"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";

const RAIN_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ01{}[]<>/\\|=+-*&^%$#@!";

function MatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();

    const fontSize = 13;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = Array(cols).fill(1);

    function draw() {
      ctx.fillStyle = "rgba(4,4,15,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drops.forEach((y, i) => {
        const char = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
        const alpha = Math.random() * 0.5 + 0.1;
        ctx.fillStyle = `rgba(139,92,246,${alpha})`;
        ctx.font = `${fontSize}px monospace`;
        ctx.fillText(char, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      setSuccessMsg("Email verified! You can now sign in.");
    }
  }, [searchParams]);

  function handleChange(field) {
    return (e) => {
      setFormData((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
      if (apiError) setApiError("");
    };
  }

  function validate() {
    const e = {};
    if (!formData.email.trim()) e.email = "Email is required";
    if (!formData.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
          return;
        }
        setApiError(data.error);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#04040f] overflow-hidden">
      {/* Left — Matrix rain panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex relative w-1/2 flex-col items-center justify-center p-16 overflow-hidden border-r border-white/[0.05]"
      >
        <MatrixRain />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-transparent to-cyan-900/20 pointer-events-none" />

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-violet-500/40">
              C
            </div>
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Welcome Back</h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xs mx-auto">
              Continue building the future of technical interviews
            </p>
          </motion.div>

          <motion.div
            className="mt-12 space-y-3"
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.7 } } }}
          >
            {[
              { emoji: "🤖", text: "AI-Powered Evaluation" },
              { emoji: "📊", text: "Instant Hiring Reports" },
              { emoji: "🎯", text: "Better Hiring Decisions" },
              { emoji: "⚡", text: "Real-Time Collaboration" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-slate-300 text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right — Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="flex-1 flex items-center justify-center px-6 py-12 relative"
      >
        <div className="ambient-orbs">
          <div className="orb orb-violet" style={{ opacity: 0.4 }} />
          <div className="orb orb-cyan" style={{ opacity: 0.3 }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-lg font-black text-white group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30">
                C
              </div>
              <span className="text-3xl font-black text-white tracking-tight">CodRoom</span>
            </Link>
            <p className="text-slate-500 mt-3 text-sm">Sign in to your account</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="animated-border"
          >
            <div className="bg-[#04040f] rounded-2xl p-8 border border-violet-500/10">
              <form onSubmit={handleSubmit} className="space-y-1">
                {successMsg && (
                  <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-emerald-400 text-sm">{successMsg}</p>
                  </div>
                )}

                {/* Email */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={handleChange("email")}
                      className={`w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? "border-rose-500/40 focus:ring-rose-500/20"
                          : "border-white/[0.06] hover:border-white/[0.12] focus:ring-violet-500/30 focus:border-violet-500/60"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-rose-400 text-xs mt-2">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">Password</label>
                    <Link href="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange("password")}
                      className={`w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                        errors.password
                          ? "border-rose-500/40 focus:ring-rose-500/20"
                          : "border-white/[0.06] hover:border-white/[0.12] focus:ring-violet-500/30 focus:border-violet-500/60"
                      }`}
                    />
                  </div>
                  {errors.password && <p className="text-rose-400 text-xs mt-2">{errors.password}</p>}
                </div>

                {apiError && (
                  <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <p className="text-rose-400 text-sm">{apiError}</p>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>Sign In <ArrowRight size={17} /></>
                  )}
                </motion.button>
              </form>

              <p className="text-slate-500 text-center mt-6 text-sm">
                No account?{" "}
                <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold link-underline">
                  Create one free
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[#04040f]" />}>
      <LoginInner />
    </Suspense>
  );
}
