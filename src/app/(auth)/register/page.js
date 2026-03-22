"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Lock, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(field) {
    return (e) => {
      setFormData((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
      if (apiError) setApiError("");
    };
  }

  function validate() {
    const e = {};
    if (!formData.name.trim()) e.name = "Name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Enter a valid email";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 6) e.password = "Minimum 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error); return; }
      router.push("/dashboard");
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "name", label: "Full Name", type: "text", placeholder: "Jane Doe", icon: User },
    { key: "email", label: "Email", type: "email", placeholder: "you@company.com", icon: Mail },
    { key: "password", label: "Password", type: "password", placeholder: "Minimum 6 characters", icon: Lock },
  ];

  return (
    <div className="flex min-h-screen bg-[#04040f] overflow-hidden">
      {/* Left — decorative panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex relative w-1/2 flex-col items-center justify-center p-16 overflow-hidden border-r border-white/[0.05]"
      >
        <div className="ambient-orbs">
          <div className="orb orb-violet" />
          <div className="orb orb-cyan" />
        </div>
        <div className="dot-grid absolute inset-0 opacity-30" />

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-violet-500/40">
              C
            </div>
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Join CodRoom</h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xs mx-auto">
              Start running AI-powered technical interviews in minutes
            </p>
          </motion.div>

          <motion.div
            className="mt-12 grid grid-cols-2 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.7 } } }}
          >
            {[
              { emoji: "🚀", title: "Free to Use", desc: "No credit card needed" },
              { emoji: "⚡", title: "Instant Setup", desc: "Ready in 30 seconds" },
              { emoji: "🤖", title: "AI Reports", desc: "Automatic evaluation" },
              { emoji: "🔗", title: "Easy Invite", desc: "One link for candidates" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-left"
              >
                <div className="text-2xl mb-2">{item.emoji}</div>
                <div className="text-white text-sm font-semibold">{item.title}</div>
                <div className="text-slate-500 text-xs mt-0.5">{item.desc}</div>
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
          <div className="orb orb-violet" style={{ opacity: 0.3 }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-lg font-black text-white group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30">
                C
              </div>
              <span className="text-3xl font-black text-white tracking-tight">CodRoom</span>
            </Link>
            <p className="text-slate-500 mt-3 text-sm">Create your interviewer account</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="animated-border"
          >
            <div className="bg-[#04040f] rounded-2xl p-8 border border-violet-500/10">
              <form onSubmit={handleSubmit} className="space-y-1">
                {fields.map(({ key, label, type, placeholder, icon: Icon }) => (
                  <div key={key} className="mb-5">
                    <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                    <div className="relative">
                      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={formData[key]}
                        onChange={handleChange(key)}
                        className={`w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                          errors[key]
                            ? "border-rose-500/40 focus:ring-rose-500/20"
                            : "border-white/[0.06] hover:border-white/[0.12] focus:ring-violet-500/30 focus:border-violet-500/60"
                        }`}
                      />
                    </div>
                    {errors[key] && <p className="text-rose-400 text-xs mt-2">{errors[key]}</p>}
                  </div>
                ))}

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
                    <>Create Account <ArrowRight size={17} /></>
                  )}
                </motion.button>
              </form>

              <p className="text-slate-500 text-center mt-6 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold link-underline">
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
