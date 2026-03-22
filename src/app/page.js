"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Zap, Play, Video, MessageSquare, FileText,
  Shield, Eye, ArrowRight, Sparkles, StickyNote,
} from "lucide-react";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import CodeEditorSim from "@/components/ui/CodeEditorSim";

// ── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      className={`fixed top-0 w-full z-50 transition-all duration-400 ${
        scrolled
          ? "bg-[#09090B]/85 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#00E87B] flex items-center justify-center">
            <span className="font-black text-sm text-black">&lt;/&gt;</span>
          </div>
          <span className="font-bold text-lg text-white group-hover:text-[#00E87B] transition-colors">
            cod<span className="text-[#00E87B] group-hover:text-white transition-colors">Room</span>
          </span>
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Pricing"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="text-sm text-white/50 hover:text-white transition-colors font-medium">
              {l}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2">
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 rounded-xl text-sm font-bold text-black transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#00E87B,#10B981)", boxShadow: "0 0 20px rgba(0,232,123,0.25)" }}
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Section reveal wrapper ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, iconCls, delay }) {
  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <Reveal delay={delay}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0F0F14] p-6 h-full"
        style={{ transition: "border-color 0.3s", borderColor: hovered ? "rgba(0,232,123,0.15)" : undefined }}
      >
        {hovered && (
          <div
            className="absolute pointer-events-none z-0"
            style={{
              width: 360, height: 360,
              left: mouse.x - 180, top: mouse.y - 180,
              background: "radial-gradient(circle, rgba(0,232,123,0.07), transparent 70%)",
            }}
          />
        )}
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-xl ${iconCls} border flex items-center justify-center mb-4`}>
            <Icon size={18} />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
          <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
        </div>
      </motion.div>
    </Reveal>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#09090B] text-white overflow-x-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 pointer-events-none z-0 dot-grid-green opacity-100" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(0,232,123,0.04), transparent 70%)", filter: "blur(80px)" }} />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.05), transparent 70%)", filter: "blur(80px)" }} />

      <div className="relative z-10">
        <Navbar />

        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-6 pt-28 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6"
              style={{ borderColor: "rgba(0,232,123,0.2)", background: "rgba(0,232,123,0.05)" }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-[#00E87B]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-mono text-[#00E87B]">Now in Public Beta</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.04] tracking-tight"
            >
              Interview
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #00E87B, #22D3EE, #6366F1)", backgroundSize: "200% 200%", animation: "gradientShift 5s linear infinite" }}
              >
                Smarter.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-lg text-white/50 mt-6 leading-relaxed max-w-lg"
            >
              Real-time collaborative coding with live video, AI evaluation, code playback, and instant hiring reports — all in one room.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center gap-4 mt-8"
            >
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base text-black transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#00E87B,#10B981)", boxShadow: "0 0 24px rgba(0,232,123,0.25)" }}
              >
                Start for Free
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="px-7 py-3.5 rounded-xl font-semibold text-base text-white/70 hover:text-white border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.04] transition-all"
              >
                See How It Works
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="flex items-center gap-4 mt-10"
            >
              <div className="flex -space-x-2">
                {["#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#6366F1"].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090B] flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: color + "50" }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/40">
                <span className="text-white font-semibold">10,000+</span> interviews conducted
              </p>
            </motion.div>
          </div>

          {/* Right — live editor */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,232,123,0.04), transparent 70%)" }} />
            <CodeEditorSim />
          </motion.div>
        </section>

        {/* ── Stats ── */}
        <section className="max-w-4xl mx-auto px-6 py-8">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0F0F14] p-8 glow-border-green">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: 8, suffix: "+", label: "Languages" },
                { value: 18, suffix: "+", label: "Problems" },
                { value: 42, suffix: "s", label: "AI Report" },
                { value: 100, suffix: "%", label: "Free" },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className="text-center">
                    <p className="text-4xl font-black text-white" style={{ textShadow: "0 0 20px rgba(0,232,123,0.3)" }}>
                      <AnimatedCounter value={s.value} suffix={s.suffix} />
                    </p>
                    <p className="text-xs text-white/30 mt-2 font-mono uppercase tracking-widest">{s.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <Reveal>
              <span className="font-mono text-xs text-[#00E87B] tracking-widest uppercase">Features</span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="text-4xl sm:text-5xl font-black mt-4 tracking-tight">
                Everything in one room
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-white/40 mt-4 text-lg">No tabs. No switching tools. One link, full interview.</p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* AI hero card */}
            <Reveal delay={0} className="lg:col-span-2">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="p-8 rounded-2xl border border-white/[0.07] bg-[#0F0F14] hover:border-[rgba(0,232,123,0.15)] transition-colors h-full"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#00E87B]/10 border border-[#00E87B]/20 flex items-center justify-center text-2xl mb-5">🤖</div>
                    <h3 className="text-2xl font-bold text-white mb-3">AI Evaluation Engine</h3>
                    <p className="text-white/40 leading-relaxed">
                      Groq AI analyzes code for correctness, time/space complexity, edge cases, and quality — generating a full hiring report in seconds after every session.
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col gap-3 flex-shrink-0">
                    {[
                      { label: "Quality", value: "9/10", color: "#00E87B" },
                      { label: "Complexity", value: "O(n)", color: "#22D3EE" },
                      { label: "Verdict", value: "HIRE ✓", color: "#6366F1" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl px-4 py-2.5 text-center min-w-[90px] border" style={{ backgroundColor: item.color + "10", borderColor: item.color + "25", color: item.color }}>
                        <div className="text-base font-bold">{item.value}</div>
                        <div className="text-xs opacity-60 mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </Reveal>

            {[
              { icon: Zap,           title: "Real-Time Editor",  desc: "Monaco Editor (VS Code engine). Both users see every keystroke live.",           iconCls: "bg-[#22D3EE]/10 border-[#22D3EE]/20 text-[#22D3EE]" },
              { icon: Video,         title: "Built-in Video",    desc: "WebRTC peer-to-peer video. No Zoom, no Meet. Just open the room.",               iconCls: "bg-[#EC4899]/10 border-[#EC4899]/20 text-[#EC4899]" },
              { icon: Eye,           title: "Code Playback",     desc: "Replay every keystroke after the interview. Timeline scrubber, speed control.",  iconCls: "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]" },
              { icon: Shield,        title: "Anti-Cheat",        desc: "Tab switch detection, paste monitoring, fullscreen enforcement.",                iconCls: "bg-[#EC4899]/10 border-[#EC4899]/20 text-[#EC4899]" },
              { icon: FileText,      title: "Problem Bank",      desc: "18+ curated problems — arrays, trees, graphs, DP and more.",                     iconCls: "bg-[#6366F1]/10 border-[#6366F1]/20 text-[#6366F1]" },
              { icon: MessageSquare, title: "Live Chat",         desc: "Real-time messaging between interviewer and candidate.",                         iconCls: "bg-[#6366F1]/10 border-[#6366F1]/20 text-[#6366F1]" },
              { icon: StickyNote,    title: "Private Notes",     desc: "Interviewer-only notes, auto-saved and included in the AI report.",              iconCls: "bg-[#00E87B]/10 border-[#00E87B]/20 text-[#00E87B]" },
            ].map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 0.07} />
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <Reveal>
              <span className="font-mono text-xs text-[#00E87B] tracking-widest uppercase">Process</span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="text-4xl sm:text-5xl font-black mt-4 tracking-tight">
                From zero to report
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Create Room",       desc: "Pick a problem, set language, get a shareable invite link",          icon: "🏗️", color: "#6366F1" },
              { step: "02", title: "Invite Candidate",  desc: "Send the link. They join instantly — no signup needed",              icon: "📨", color: "#22D3EE" },
              { step: "03", title: "Interview Live",    desc: "Code together, video call, chat, run code in real-time",             icon: "⚡", color: "#00E87B" },
              { step: "04", title: "Get AI Report",     desc: "End the session. AI generates a full evaluation instantly",          icon: "🤖", color: "#F59E0B" },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 0.1}>
                <div className="text-center group">
                  <div
                    className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center text-2xl border group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: item.color + "15", borderColor: item.color + "30" }}
                  >
                    {item.icon}
                  </div>
                  <div className="font-mono text-xs text-white/20 mb-2 tracking-widest">{item.step}</div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-4xl mx-auto px-6 py-24">
          <Reveal>
            <div className="relative rounded-3xl border border-white/[0.07] bg-[#0F0F14] p-14 text-center overflow-hidden glow-border-green">
              <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,232,123,0.07), transparent 70%)", filter: "blur(40px)" }} />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.07), transparent 70%)", filter: "blur(40px)" }} />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-8 flex items-center justify-center" style={{ background: "rgba(0,232,123,0.1)", border: "1px solid rgba(0,232,123,0.2)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E87B" strokeWidth="1.5">
                    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>

                <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
                  Run your first
                  <br />
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#00E87B,#22D3EE)" }}>
                    AI interview
                  </span>
                </h2>
                <p className="text-white/40 mt-4 text-lg max-w-sm mx-auto">
                  Free to use. No credit card. No setup. Just create a room.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-lg text-black"
                      style={{ background: "linear-gradient(135deg,#00E87B,#10B981)", boxShadow: "0 0 30px rgba(0,232,123,0.3)" }}
                    >
                      Get Started Free
                      <ArrowRight size={18} />
                    </Link>
                  </motion.div>
                </div>

                {/* Terminal hint */}
                <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-black/30">
                  <span className="font-mono text-xs text-white/30">$</span>
                  <span className="font-mono text-xs text-[#00E87B]">npx create-codroom@latest</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[0.05] bg-[#06060A]">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00E87B] flex items-center justify-center text-xs font-black text-black">&lt;/&gt;</div>
              <span className="text-white/30 text-sm">codRoom — Technical interviews, powered by AI</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E87B] animate-pulse" />
              <span className="text-xs text-white/20 font-mono">All systems operational</span>
            </div>
            <span className="text-white/20 text-sm">© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
