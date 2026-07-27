"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useAnimationFrame } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

/* ── Drifting aurora orbs ─────────────────────────────────────── */
function AuroraOrbs() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 120% 80% at 80% -10%, #1a0e3a 0%, #0d0d1a 45%, #080c18 100%)" }} />
      <motion.div
        animate={{ x: [0, -40, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", width: 700, height: 700, top: -200, right: -200, background: "radial-gradient(circle, rgba(120,80,255,0.2) 0%, transparent 65%)", filter: "blur(130px)" }}
      />
      <motion.div
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{ position: "absolute", width: 500, height: 500, bottom: "10%", left: -100, background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 65%)", filter: "blur(110px)" }}
      />
      <motion.div
        animate={{ x: [0, -30, 40, 0], y: [0, 20, -30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{ position: "absolute", width: 400, height: 400, top: "40%", left: "40%", background: "radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 65%)", filter: "blur(120px)" }}
      />
    </div>
  );
}

/* ── Animated shimmer border ──────────────────────────────────── */
function ShimmerBorder({ children }) {
  const angleRef = useRef(0);
  const elRef    = useRef(null);

  useAnimationFrame((_, delta) => {
    angleRef.current = (angleRef.current + delta * 0.04) % 360;
    if (elRef.current) {
      elRef.current.style.background = `conic-gradient(from ${angleRef.current}deg at 50% 50%, rgba(167,139,250,0.55) 0deg, rgba(56,189,248,0.4) 90deg, rgba(244,114,182,0.35) 180deg, rgba(167,139,250,0.55) 360deg)`;
    }
  });

  return (
    <div className="relative rounded-3xl p-px" style={{ isolation: "isolate" }}>
      <div ref={elRef} className="absolute inset-0 rounded-3xl" style={{ opacity: 0.6 }} />
      <div className="absolute inset-px rounded-3xl" style={{ background: "rgba(10,8,28,0.85)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Input field ──────────────────────────────────────────────── */
function Field({ label, type, placeholder, value, onChange, error, right }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: error ? "1px solid rgba(244,114,182,0.5)" : "1px solid rgba(255,255,255,0.08)",
            color: "#f0f0f5",
            paddingRight: right ? "2.75rem" : undefined,
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.06)"; }}
          onBlur={(e)  => { e.target.style.borderColor = error ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <p className="text-xs mt-1.5" style={{ color: "#f472b6" }}>{error}</p>}
    </div>
  );
}

/* ── Register page ────────────────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm]         = useState({ name: "", email: "", password: "" });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  function handleChange(field) {
    return (e) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
      if (apiError) setApiError("");
    };
  }

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password)     e.password = "Password is required";
    else if (form.password.length < 8)          e.password = "Minimum 8 characters";
    else if (!/[A-Z]/.test(form.password))      e.password = "Must include an uppercase letter";
    else if (!/[0-9]/.test(form.password))      e.password = "Must include a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      const res  = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error); return; }
      if (data.needsVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
      router.push("/dashboard");
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden" style={{ color: "#f0f0f5" }}>
      <AuroraOrbs />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold" style={{ color: "#f0f0f5" }}>
            cod<span style={{ color: "#a78bfa" }}>Room</span>
          </Link>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Create your account
          </p>
        </div>

        <ShimmerBorder>
          <div className="rounded-3xl px-8 py-9">
            {/* Top refraction highlight */}
            <div className="absolute inset-x-4 top-px h-px rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 40%, rgba(167,139,250,0.3) 60%, transparent)" }} />

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                label="Full name"
                type="text"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange("name")}
                error={errors.name}
              />
              <Field
                label="Email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange("email")}
                error={errors.email}
              />

              {/* Password with eye toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
                  Password
                </label>
                <Field
                  type={showPw ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={form.password}
                  onChange={handleChange("password")}
                  error={errors.password}
                  right={
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.8)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
              </div>

              {apiError && (
                <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(244,114,182,0.07)", border: "1px solid rgba(244,114,182,0.2)", color: "#f9a8d4" }}>
                  {apiError}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02, boxShadow: "0 0 32px rgba(167,139,250,0.25)" }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                style={{
                  background: "linear-gradient(135deg, rgba(167,139,250,0.3) 0%, rgba(56,189,248,0.2) 100%)",
                  border: "1px solid rgba(167,139,250,0.4)",
                  color: "#e9d5ff",
                  boxShadow: "0 0 20px rgba(167,139,250,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                {loading ? (
                  <motion.div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
                ) : (
                  <><span>Create account</span><ArrowRight size={15} /></>
                )}
              </motion.button>
            </form>

            <div className="mt-7 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                Already have an account?{" "}
                <Link href="/login" className="font-medium transition-colors" style={{ color: "#a78bfa" }}
                  onMouseEnter={(e) => (e.target.style.color = "#c4b5fd")}
                  onMouseLeave={(e) => (e.target.style.color = "#a78bfa")}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </ShimmerBorder>

        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.15)" }}>
          No credit card required · Free to start
        </p>
      </motion.div>
    </div>
  );
}
