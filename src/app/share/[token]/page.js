"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  CheckCircle, XCircle, AlertCircle, TrendingUp,
  Zap, ChevronRight, Shield, Clock, Code2,
} from "lucide-react";

const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n) || 0));
const pct10 = (n) => Math.round(clamp(n, 0, 10) * 10);

function recKey(v) {
  return (v || "BORDERLINE").toUpperCase().replace(/\s+/g, "_");
}

const REC = {
  STRONG_HIRE: { label: "Strong Hire", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle },
  HIRE:        { label: "Hire",        color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",       icon: CheckCircle },
  BORDERLINE:  { label: "Borderline",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",     icon: AlertCircle },
  NO_HIRE:     { label: "No Hire",     color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/30",       icon: XCircle },
};

function ScoreBar({ label, value, color = "bg-violet-500" }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold">{value}/10</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct10(value)}%` }} />
      </div>
    </div>
  );
}

export default function SharedReportPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    fetch(`/api/share/${token}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load report"))
      .finally(() => { clearTimeout(timeoutId); setLoading(false); });
  }, [token]);

  const rec = useMemo(() => REC[recKey(data?.report?.recommendation)] || REC.BORDERLINE, [data]);
  const RecIcon = rec.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04040f] flex items-center justify-center">
        <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
        <div className="relative z-10 text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#04040f] flex items-center justify-center">
        <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
        <div className="relative z-10 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-slate-300 text-lg mb-2">{error}</p>
          <p className="text-slate-600 text-sm mb-6">This link may have expired or been revoked.</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">← Go to CodRoom</Link>
        </div>
      </div>
    );
  }

  const { report, meta } = data;

  const rubricItems = [
    { label: "Problem Solving", value: report.rubricProblemSolving },
    { label: "Communication",   value: report.rubricCommunication },
    { label: "Code Quality",    value: report.rubricCodeQuality },
    { label: "Edge Cases",      value: report.rubricEdgeCases },
    { label: "Speed",           value: report.rubricSpeed },
  ];
  const hasRubric = rubricItems.some((r) => r.value > 0);

  return (
    <div className="min-h-screen bg-[#04040f] text-slate-200">
      <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
      <div className="dot-grid fixed inset-0 pointer-events-none opacity-30" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#04040f]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-black text-xs">C</div>
            <span className="text-white font-bold text-sm">CodRoom</span>
            <span className="text-slate-700 mx-1">·</span>
            <span className="text-slate-500 text-xs">Shared Report</span>
          </div>
          <Link href="/" className="text-xs text-slate-500 hover:text-violet-400 transition-colors">codroom.app</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Meta header */}
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6">
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">Interview Report</p>
          <h1 className="text-2xl font-black text-white mb-3">{meta.roomTitle || "Technical Interview"}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            {meta.candidateName && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                {meta.candidateName}
              </span>
            )}
            {meta.language && (
              <span className="flex items-center gap-1.5">
                <Code2 size={13} className="text-cyan-400" />
                {meta.language.toUpperCase()}
              </span>
            )}
            {meta.duration && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-500" />
                {Math.round(meta.duration / 60)} min
              </span>
            )}
            {meta.problemTitle && (
              <span className="flex items-center gap-1.5">
                <span className="text-slate-600">📋</span>
                {meta.problemTitle}
              </span>
            )}
          </div>
        </div>

        {/* Verdict banner */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border ${rec.bg}`}>
          <div className="flex items-center gap-4">
            <RecIcon size={36} className={rec.color} />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">AI Suggestion</p>
              <h2 className={`text-3xl font-black ${rec.color}`}>{rec.label}</h2>
              <p className="text-xs text-slate-600 mt-1">AI-generated suggestion, not a final decision.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-center px-5 py-3 bg-black/20 rounded-xl">
              <div className="text-2xl font-black text-white">{clamp(report.overallScore, 0, 100)}</div>
              <div className="text-xs text-slate-500">Overall Score</div>
            </div>
            <div className="text-center px-5 py-3 bg-black/20 rounded-xl">
              <div className="text-lg font-bold text-white font-mono">{report.timeComplexity || "—"}</div>
              <div className="text-xs text-slate-500">Time</div>
            </div>
            <div className="text-center px-5 py-3 bg-black/20 rounded-xl">
              <div className="text-lg font-bold text-white font-mono">{report.spaceComplexity || "—"}</div>
              <div className="text-xs text-slate-500">Space</div>
            </div>
          </div>
        </div>

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left col */}
          <div className="lg:col-span-2 space-y-5">

            {/* Radar + score bars */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp size={15} className="text-violet-400" /> Performance Breakdown
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={[
                  { subject: "Correctness",  score: clamp(report.correctness, 0, 10) },
                  { subject: "Code Quality", score: clamp(report.codeQuality, 0, 10) },
                  { subject: "Edge Cases",   score: clamp(report.edgeCaseHandling, 0, 10) },
                ]}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(10,8,24,0.95)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: "white", fontSize: 12 }}
                    formatter={(v) => [`${v}/10`]}
                  />
                  <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.18} dot={{ fill: "#8b5cf6", r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
              <ScoreBar label="Correctness"        value={report.correctness}      color="bg-emerald-500" />
              <ScoreBar label="Code Quality"       value={report.codeQuality}      color="bg-violet-500" />
              <ScoreBar label="Edge Case Handling" value={report.edgeCaseHandling} color="bg-cyan-500" />
            </div>

            {/* Summary */}
            {report.summary && (
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Zap size={15} className="text-cyan-400" /> Summary
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{report.summary}</p>
              </div>
            )}

            {/* Improvements */}
            {report.improvements && (
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <ChevronRight size={15} className="text-amber-400" /> Areas to Improve
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{report.improvements}</p>
              </div>
            )}
          </div>

          {/* Right col */}
          <div className="space-y-5">

            {/* Score pills */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white mb-1">Scores</h2>
              {[
                { label: "Correctness",        value: report.correctness },
                { label: "Code Quality",       value: report.codeQuality },
                { label: "Edge Case Handling", value: report.edgeCaseHandling },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                  <div className="text-xl font-bold text-white">{value}<span className="text-slate-600 text-sm">/10</span></div>
                </div>
              ))}
            </div>

            {/* Interviewer rubric */}
            {hasRubric && (
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield size={14} className="text-violet-400" /> Interviewer Rubric
                </h2>
                {rubricItems.map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className="text-violet-400 text-sm font-semibold">{value}/10</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct10(value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs pb-4">Generated by CodRoom · AI-powered technical interviews</p>
      </div>
    </div>
  );
}
