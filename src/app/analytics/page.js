"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ArrowLeft, TrendingUp, CheckCircle, FileText,
  Clock, BarChart2, Code2, Layers,
} from "lucide-react";
import Navbar from "@/components/ui/Navbar";

const REC_COLOR = {
  STRONG_HIRE: "#22c55e",
  HIRE:        "#06b6d4",
  BORDERLINE:  "#f59e0b",
  NO_HIRE:     "#ef4444",
};

const REC_LABEL = {
  STRONG_HIRE: "Strong Hire",
  HIRE:        "Hire",
  BORDERLINE:  "Borderline",
  NO_HIRE:     "No Hire",
};

const LANG_COLORS = ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#67e8f9"];
const DIFF_COLOR  = { easy: "#22c55e", medium: "#f59e0b", hard: "#ef4444" };

const PERIODS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const CHART_STYLE = {
  contentStyle: {
    background: "rgba(10,8,24,0.95)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    color: "white",
    fontSize: 12,
  },
};

function StatCard({ icon: Icon, label, value, sub, color = "violet" }) {
  const colors = {
    violet:  "from-violet-600/15 to-violet-600/0 border-violet-500/20 text-violet-400",
    emerald: "from-emerald-600/15 to-emerald-600/0 border-emerald-500/20 text-emerald-400",
    cyan:    "from-cyan-600/15 to-cyan-600/0 border-cyan-500/20 text-cyan-400",
    amber:   "from-amber-600/15 to-amber-600/0 border-amber-500/20 text-amber-400",
  };
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-sm">{label}</span>
        <Icon size={18} className={colors[color].split(" ")[3]} />
      </div>
      <div className="text-3xl font-black text-white">{value ?? "—"}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}

function ScoreBar({ label, value, max = 100, color = "bg-violet-500" }) {
  const pct = value != null ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold">
          {value != null ? `${value}${max === 10 ? "/10" : ""}` : "—"}
        </span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatDuration(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return `${m}m`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(30);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((d) => d && setUser(d.user));
  }, [router]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Derived chart data ────────────────────────────────────────────────────
  const recChartData = data
    ? Object.entries(data.distributions.recommendations).map(([key, count]) => ({
        name:  REC_LABEL[key] ?? key,
        value: count,
        fill:  REC_COLOR[key] ?? "#64748b",
      }))
    : [];

  const langChartData = data
    ? Object.entries(data.distributions.languages)
        .sort((a, b) => b[1] - a[1])
        .map(([lang, count], i) => ({ name: lang, count, fill: LANG_COLORS[i % LANG_COLORS.length] }))
    : [];

  const diffChartData = data
    ? Object.entries(data.distributions.difficulties).map(([diff, count]) => ({
        name:  diff.charAt(0).toUpperCase() + diff.slice(1),
        count,
        fill:  DIFF_COLOR[diff] ?? "#64748b",
      }))
    : [];

  return (
    <div className="min-h-screen bg-[#04040f]">
      <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
      <div className="dot-grid fixed inset-0 pointer-events-none z-0 opacity-30" />

      <div className="relative z-10">
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Analytics</h1>
                <p className="text-slate-500 text-sm mt-0.5">Your interviewing patterns at a glance</p>
              </div>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              {PERIODS.map((p) => (
                <button key={p.days} onClick={() => setDays(p.days)}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    days === p.days
                      ? "bg-violet-600/30 border border-violet-500/40 text-violet-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
          ) : !data ? (
            <div className="text-center py-24 text-slate-500">Failed to load analytics.</div>
          ) : (
            <>
              {/* ── Overview stats ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Layers}    label="Rooms Created"    value={data.overview.totalRooms}         color="violet" />
                <StatCard icon={CheckCircle} label="Completed"      value={data.overview.completedInterviews} color="emerald"
                  sub={`${data.overview.completionRate}% completion rate`} />
                <StatCard icon={FileText}  label="Reports Generated" value={data.overview.reportsGenerated}  color="cyan" />
                <StatCard icon={TrendingUp} label="Avg Overall Score" value={data.averageScores.overall != null ? `${data.averageScores.overall}/100` : "—"} color="amber" />
              </div>

              {/* ── Charts row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

                {/* Recommendation distribution */}
                <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <BarChart2 size={14} className="text-violet-400" /> Recommendations
                  </h2>
                  {recChartData.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">No reports yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={recChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={3}>
                          {recChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip {...CHART_STYLE} formatter={(v, n) => [v, n]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Language distribution */}
                <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Code2 size={14} className="text-cyan-400" /> Languages Used
                  </h2>
                  {langChartData.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">No data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={langChartData} layout="vertical" margin={{ left: 8 }}>
                        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip {...CHART_STYLE} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {langChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Difficulty distribution */}
                <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Layers size={14} className="text-amber-400" /> Problem Difficulty
                  </h2>
                  {diffChartData.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">No problems assigned yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={diffChartData} margin={{ top: 4 }}>
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_STYLE} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {diffChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* ── Average AI scores ── */}
              {data.reportsGenerated > 0 && (
                <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 mb-8">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
                    <TrendingUp size={14} className="text-violet-400" /> Average AI Scores
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <ScoreBar label="Correctness"       value={data.averageScores.correctness}      max={10} color="bg-emerald-500" />
                    <ScoreBar label="Code Quality"      value={data.averageScores.codeQuality}      max={10} color="bg-violet-500" />
                    <ScoreBar label="Edge Case Handling" value={data.averageScores.edgeCaseHandling} max={10} color="bg-cyan-500" />
                  </div>
                </div>
              )}

              {/* ── Recent interviews table ── */}
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> Recent Interviews
                  </h2>
                </div>
                {data.recentInterviews.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-sm">No interviews in this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          {["Room", "Candidate", "Language", "Duration", "Status", "Score", "Recommendation"].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs text-slate-600 uppercase tracking-widest font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentInterviews.map((iv) => {
                          const recColor = REC_COLOR[iv.recommendation] ?? "#64748b";
                          const recLabel = REC_LABEL[iv.recommendation] ?? iv.recommendation ?? "—";
                          return (
                            <tr key={iv.id}
                              onClick={() => router.push(`/room/${iv.id}/report`)}
                              className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors">
                              <td className="px-5 py-3 text-white font-medium truncate max-w-[160px]">{iv.roomTitle}</td>
                              <td className="px-5 py-3 text-slate-400 truncate max-w-[120px]">{iv.candidateName || "—"}</td>
                              <td className="px-5 py-3 text-slate-400 capitalize">{iv.language}</td>
                              <td className="px-5 py-3 text-slate-400">{formatDuration(iv.duration)}</td>
                              <td className="px-5 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-lg border capitalize ${
                                  iv.status === "evaluated" ? "text-violet-400 border-violet-500/20 bg-violet-500/10"
                                  : iv.status === "completed" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                                  : "text-slate-500 border-white/[0.07] bg-white/[0.03]"
                                }`}>{iv.status}</span>
                              </td>
                              <td className="px-5 py-3 text-white font-semibold">
                                {iv.overallScore != null ? iv.overallScore : "—"}
                              </td>
                              <td className="px-5 py-3">
                                {iv.recommendation ? (
                                  <span className="text-xs font-medium" style={{ color: recColor }}>{recLabel}</span>
                                ) : (
                                  <span className="text-slate-600 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
