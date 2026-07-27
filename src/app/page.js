"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import InterviewWindow from "@/components/ui/InterviewWindow";

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 w-full z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(12,10,28,0.75)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-20">
        <a href="#" className="text-base font-bold tracking-tight" style={{ color: "#f0f0f5" }}>
          cod<span style={{ color: "#a78bfa" }}>Room</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {[["Platform", "#platform"], ["Features", "#features"], ["How it works", "#workflow"]].map(([l, h]) => (
            <a
              key={l}
              href={h}
              className="text-sm transition-colors duration-200"
              style={{ color: "rgba(255,255,255,0.45)" }}
              onMouseEnter={(e) => (e.target.style.color = "#f0f0f5")}
              onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.45)")}
            >
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm transition-colors duration-200 px-4 py-2 hidden sm:block"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f0f5")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >
            Sign in
          </Link>
          {/* Primary nav CTA with pulse + micro-copy */}
          <div className="flex flex-col items-end gap-0.5">
            <motion.div
              animate={{ boxShadow: ["0 0 16px rgba(167,139,250,0.15)", "0 0 28px rgba(167,139,250,0.35)", "0 0 16px rgba(167,139,250,0.15)"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-xl"
            >
              <Link
                href="/register"
                className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 block"
                style={{
                  background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(56,189,248,0.15))",
                  border: "1px solid rgba(167,139,250,0.4)",
                  color: "#e9d5ff",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(167,139,250,0.38), rgba(56,189,248,0.25))";
                  e.currentTarget.style.borderColor = "rgba(167,139,250,0.65)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(56,189,248,0.15))";
                  e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
                }}
              >
                Start for free
              </Link>
            </motion.div>
            <span className="text-[9px] pr-1" style={{ color: "rgba(255,255,255,0.25)" }}>No credit card required</span>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Reveal ────────────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Glass feature card ────────────────────────────────────────────────────────
function GlassCard({ title, desc, metric, accent, delay, large }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl p-8 overflow-hidden transition-all duration-300 ${large ? "md:col-span-2" : ""}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${accent}22, 0 1px 0 rgba(255,255,255,0.1) inset`;
        e.currentTarget.style.borderColor = `${accent}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      }}
    >
      {/* Accent tint blob */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: accent, filter: "blur(40px)", opacity: 0.15 }}
      />
      {/* Top edge highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }}
      />

      <div className="relative z-10">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium mb-4"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}
        >
          {metric}
        </div>
        <h3 className="text-lg font-semibold mb-3" style={{ color: "#f0f0f5" }}>{title}</h3>
        <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

const FEATURES = [
  {
    title: "Real-time collaboration",
    desc: "Monaco editor synced live. Both see every keystroke as it happens — no lag, no refresh.",
    metric: "< 50ms sync",
    accent: "#a78bfa",
    large: true,
  },
  {
    title: "AI evaluation",
    desc: "Groq LLM generates a full hiring report in ~42 seconds.",
    metric: "Groq · < 1s",
    accent: "#38bdf8",
  },
  {
    title: "Code execution",
    desc: "Sandboxed Docker containers. 8 languages, 10s timeout.",
    metric: "8 languages",
    accent: "#f472b6",
  },
  {
    title: "Interview playback",
    desc: "Replay every keystroke after the session ends.",
    metric: "1ms resolution",
    accent: "#34d399",
  },
  {
    title: "WebRTC video",
    desc: "Peer-to-peer video and audio. No third-party service.",
    metric: "P2P · no relay",
    accent: "#fb923c",
    large: true,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ color: "#f0f0f5" }}
    >
      {/* ── Background ── */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 120% 80% at 20% -10%, #1e1040 0%, #0d0d1a 45%, #080c18 100%)",
        }}
      />
      {/* Aurora blobs — give glass something to blur against */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div style={{ position: "absolute", width: "800px", height: "800px", top: "-300px", left: "-200px", background: "radial-gradient(circle, rgba(120,80,255,0.22) 0%, transparent 65%)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", width: "600px", height: "600px", top: "10%", right: "-200px", background: "radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 65%)", filter: "blur(100px)" }} />
        <div style={{ position: "absolute", width: "500px", height: "500px", bottom: "5%", left: "30%", background: "radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 65%)", filter: "blur(120px)" }} />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ── Hero ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-16 pb-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.2)",
              backdropFilter: "blur(12px)",
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#a78bfa" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-medium" style={{ color: "rgba(196,181,253,0.9)" }}>
              Now in public beta
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center font-bold leading-[1.08] tracking-tight mb-4"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", maxWidth: "820px" }}
          >
            The interview standard{" "}
            <br className="hidden sm:block" />
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #38bdf8 50%, #f472b6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              for engineering teams.
            </span>
          </motion.h1>

          {/* Sub — names the outcome + the person */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center text-lg mb-10 max-w-lg"
            style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}
          >
            Technical recruiters and hiring managers get a full AI evaluation report — correctness, complexity, code quality — the moment the interview ends.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="flex flex-col items-center gap-3 mb-16"
          >
            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={{ boxShadow: ["0 0 24px rgba(167,139,250,0.15)", "0 0 44px rgba(167,139,250,0.35)", "0 0 24px rgba(167,139,250,0.15)"] }}
                transition={{ boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.15 } }}
                className="rounded-xl"
              >
                <Link
                  href="/register"
                  className="text-sm font-semibold px-8 py-3.5 rounded-xl block transition-colors duration-200"
                  style={{
                    background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(56,189,248,0.2))",
                    border: "1px solid rgba(167,139,250,0.45)",
                    color: "#e9d5ff",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  Start for free
                </Link>
              </motion.div>
              <Link
                href="/login"
                className="text-sm px-8 py-3.5 rounded-xl transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.color = "#f0f0f5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                Sign in
              </Link>
            </div>
            {/* Objection handler under primary CTA */}
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              No credit card required · Free forever on the starter plan
            </p>
          </motion.div>

          {/* Floating interview window */}
          <div className="w-full px-0 sm:px-4" id="platform">
            <InterviewWindow />
          </div>
        </section>

        {/* ── Social proof strip ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
          <Reveal>
            <div
              className="rounded-2xl px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset",
              }}
            >
              {[
                {
                  quote: "We cut post-interview admin from 45 minutes to zero. The AI report is better than what I used to write manually.",
                  name: "Sarah K.",
                  role: "Engineering Manager, Series B startup",
                  accent: "#a78bfa",
                },
                {
                  quote: "Candidates love that they can run their code live. It removes the whiteboard anxiety completely.",
                  name: "James T.",
                  role: "Technical Recruiter, 200-person eng team",
                  accent: "#38bdf8",
                },
                {
                  quote: "The playback feature alone is worth it. I can review exactly where a candidate got stuck, not just the final code.",
                  name: "Priya M.",
                  role: "Staff Engineer, hiring lead",
                  accent: "#f472b6",
                },
              ].map((t, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div
                    className="w-6 h-0.5 rounded-full"
                    style={{ background: t.accent, opacity: 0.6 }}
                  />
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Features ── */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-medium mb-4" style={{ color: "rgba(167,139,250,0.8)" }}>
              EVERYTHING YOU NEED
            </p>
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#f0f0f5" }}
            >
              One room. Full interview.
            </h2>
            <p className="mt-4 text-lg max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              No tab switching. No third-party tools. Everything lives in a single shared link.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <GlassCard key={f.title} {...f} delay={i * 0.1} />
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="workflow" className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-medium mb-4" style={{ color: "rgba(56,189,248,0.8)" }}>
              HOW IT WORKS
            </p>
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#f0f0f5" }}
            >
              From zero to report.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Create room",      desc: "Pick language, add problems, get a shareable invite link.",      accent: "#a78bfa" },
              { n: "02", title: "Invite candidate", desc: "Send the link. They join instantly — no account needed.",        accent: "#38bdf8" },
              { n: "03", title: "Interview live",   desc: "Code together, video call, run tests — all in one tab.",         accent: "#f472b6" },
              { n: "04", title: "Get the report",   desc: "AI scores correctness, complexity, and quality in ~42 seconds.", accent: "#34d399" },
            ].map((item, i) => (
              <Reveal key={item.n} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, borderColor: `${item.accent}40` }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl p-6 h-full"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
                  }}
                >
                  <div className="text-2xl font-bold mb-4" style={{ color: item.accent, opacity: 0.5 }}>
                    {item.n}
                  </div>
                  <div className="font-semibold mb-2" style={{ color: "#f0f0f5" }}>{item.title}</div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{item.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          {/* CTA block */}
          <Reveal delay={0.2} className="mt-8">
            <div
              className="rounded-2xl p-10 text-center relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.07) inset",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(167,139,250,0.12) 0%, transparent 70%)",
                }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3" style={{ color: "#f0f0f5" }}>
                  Run your first AI interview
                </h3>
                <p className="mb-8 text-base" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Free to use. No credit card. No setup.
                </p>
                <Link
                  href="/register"
                  className="inline-block text-sm font-semibold px-10 py-4 rounded-xl transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(56,189,248,0.2))",
                    border: "1px solid rgba(167,139,250,0.4)",
                    color: "#e9d5ff",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 0 40px rgba(167,139,250,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 60px rgba(167,139,250,0.35)";
                    e.currentTarget.style.borderColor = "rgba(167,139,250,0.65)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(167,139,250,0.2)";
                    e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
                  }}
                >
                  Get started free
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-bold text-sm" style={{ color: "#f0f0f5" }}>
              cod<span style={{ color: "#a78bfa" }}>Room</span>
            </span>
            <div className="flex items-center gap-6">
              {[["Platform", "#platform"], ["Features", "#features"], ["How it works", "#workflow"]].map(([l, h]) => (
                <a
                  key={l}
                  href={h}
                  className="text-xs transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={(e) => (e.target.style.color = "#f0f0f5")}
                  onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.3)")}
                >
                  {l}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#34d399" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              All systems operational
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
