"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import Navbar from "@/components/ui/Navbar";

const REC_COLORS = {
  STRONG_HIRE: "bg-green-600 text-white",
  HIRE:        "bg-green-100 text-green-800",
  BORDERLINE:  "bg-yellow-100 text-yellow-800",
  NO_HIRE:     "bg-red-100 text-red-800",
};

const REC_BG = {
  STRONG_HIRE: "bg-green-100 text-green-800",
  HIRE:        "bg-emerald-50 text-emerald-700",
  BORDERLINE:  "bg-yellow-50 text-yellow-700",
  NO_HIRE:     "bg-red-50 text-red-700",
};

const REC_ORDER = ["STRONG_HIRE", "HIRE", "BORDERLINE", "NO_HIRE"];

function formatRec(rec) {
  return (rec || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

function ScoreBadge({ value, max = 10 }) {
  if (value == null) return <span className="text-gray-400 text-sm">—</span>;
  const pct = value / max;
  const cls =
    pct >= 0.8 ? "text-green-700 bg-green-100"
    : pct >= 0.6 ? "text-yellow-700 bg-yellow-100"
    : "text-red-700 bg-red-100";
  return (
    <span className={`text-sm font-mono px-2 py-0.5 rounded ${cls}`}>
      {value}/{max}
    </span>
  );
}

function SortTh({ label, field, current, dir, onToggle }) {
  const active = current === field;
  return (
    <th
      className="p-3 text-left text-sm text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap"
      onClick={() => onToggle(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (dir === "desc" ? " ↓" : " ↑") : <ArrowUpDown size={12} className="text-gray-400" />}
      </span>
    </th>
  );
}

export default function PipelineComparePage() {
  const { pipelineId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("rankScore");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    fetch(`/api/pipelines/${pipelineId}/compare`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [pipelineId]);

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  if (loading) return <LoadingSkeleton />;
  if (!data?.candidates) {
    return (
      <div className="min-h-screen bg-[#04040f] flex items-center justify-center text-slate-400">
        Pipeline not found
      </div>
    );
  }

  const sorted = [...data.candidates].sort((a, b) => {
    const av = getNestedValue(a, sortField) ?? -Infinity;
    const bv = getNestedValue(b, sortField) ?? -Infinity;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  return (
    <div className="min-h-screen bg-[#04040f]">
      <div className="relative z-10">
        <Navbar user={null} />
        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-4 transition-colors"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
            <h1 className="text-3xl font-black text-white">{data.pipeline.name}</h1>
            <div className="flex gap-4 mt-2 text-sm text-slate-500">
              <span>{data.summary.total} candidates</span>
              <span>{data.summary.evaluated} evaluated</span>
              {data.summary.avgOverallScore != null && (
                <span>Avg score: {data.summary.avgOverallScore}/100</span>
              )}
              <span className="capitalize px-2 py-0.5 rounded-full text-xs border border-white/10 text-slate-400">
                {data.pipeline.status.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Recommendation distribution */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {REC_ORDER.map((rec) => (
              <div key={rec} className={`p-4 rounded-xl text-center ${REC_BG[rec]}`}>
                <div className="text-2xl font-bold">
                  {data.summary.recommendationDistribution[rec] || 0}
                </div>
                <div className="text-xs mt-1">{formatRec(rec)}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          {sorted.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              No completed interviews in this pipeline yet.
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.01]"
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <SortTh label="Candidate"    field="candidateName"                    current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Overall"      field="scores.overallScore"              current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Correctness"  field="scores.correctness"               current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Code Quality" field="scores.codeQuality"               current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Edge Cases"   field="scores.edgeCaseHandling"          current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Velocity"     field="behavioral.codingVelocity"        current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Test Pass %"  field="behavioral.testRunPattern.passRate" current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Rank"         field="rankScore"                        current={sortField} dir={sortDir} onToggle={toggleSort} />
                    <th className="p-3 text-left text-sm text-gray-600">Recommendation</th>
                    <th className="p-3 text-left text-sm text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, idx) => (
                    <tr
                      key={c.interviewId}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                        idx === 0 && sortField === "rankScore" ? "bg-green-950/20" : ""
                      }`}
                    >
                      <td className="p-3 text-white font-medium">{c.candidateName}</td>
                      <td className="p-3"><ScoreBadge value={c.scores?.overallScore} max={100} /></td>
                      <td className="p-3"><ScoreBadge value={c.scores?.correctness} /></td>
                      <td className="p-3"><ScoreBadge value={c.scores?.codeQuality} /></td>
                      <td className="p-3"><ScoreBadge value={c.scores?.edgeCaseHandling} /></td>
                      <td className="p-3 text-sm text-slate-400">
                        {c.behavioral.codingVelocity != null ? `${c.behavioral.codingVelocity} L/min` : "—"}
                      </td>
                      <td className="p-3 text-sm text-slate-400">
                        {c.behavioral.testRunPattern.passRate != null
                          ? `${c.behavioral.testRunPattern.passRate}%`
                          : "—"}
                      </td>
                      <td className="p-3 text-white font-bold text-sm">
                        {c.rankScore ?? "—"}
                      </td>
                      <td className="p-3">
                        {c.recommendation ? (
                          <span className={`text-xs px-2 py-1 rounded-full ${REC_COLORS[c.recommendation] || "bg-gray-100"}`}>
                            {formatRec(c.recommendation)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">Pending</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/room/${c.roomId}/report`)}
                            className="text-xs px-2 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
                          >
                            Report
                          </button>
                          <button
                            onClick={() => router.push(`/room/${c.roomId}/playback`)}
                            className="text-xs px-2 py-1 bg-white/[0.04] text-slate-400 border border-white/[0.07] rounded-lg hover:bg-white/[0.08] transition-colors"
                          >
                            Playback
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#04040f]">
      <div className="max-w-7xl mx-auto px-6 py-10 animate-pulse">
        <div className="h-8 bg-white/[0.05] rounded-xl w-1/3 mb-4" />
        <div className="grid grid-cols-5 gap-3 mb-8">
          {Array(5).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/[0.03] rounded-xl" />)}
        </div>
        <div className="h-64 bg-white/[0.03] rounded-2xl" />
      </div>
    </div>
  );
}
