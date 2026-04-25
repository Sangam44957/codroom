"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  ArrowLeft, Play, Share2, Trash2, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Clock, Code2,
  TrendingUp, Zap, Shield, ChevronRight, Copy, Check, Download
} from "lucide-react";

const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n) || 0));
const pct10 = (n) => Math.round(clamp(n, 0, 10) * 10);

const REC = {
  STRONG_HIRE: { label: "Strong Hire", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400", icon: CheckCircle },
  HIRE:        { label: "Hire",        color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",    dot: "bg-cyan-400",    icon: CheckCircle },
  BORDERLINE:  { label: "Borderline",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",  dot: "bg-amber-400",   icon: AlertCircle },
  NO_HIRE:     { label: "No Hire",     color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/30",    dot: "bg-rose-400",    icon: XCircle },
};

function recKey(v) {
  return (v || "BORDERLINE").toUpperCase().replace(/\s+/g, "_");
}

function ScoreBar({ label, value, color = "bg-violet-500" }) {
  const pct = pct10(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold">{value}/10</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MetricPill({ label, value, sub }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value || "—"}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function RubricSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-violet-400 text-sm font-semibold">{value}/10</span>
      </div>
      <input
        type="range" min={0} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "#8b5cf6" }}
      />
    </div>
  );
}

export default function ReportPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [shareRecipient, setShareRecipient] = useState("");
  const [rubricSaved, setRubricSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [rubric, setRubric] = useState({
    problemSolving: 0, communication: 0, codeQuality: 0, edgeCases: 0, speed: 0,
  });

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const roomRes = await fetch(`/api/rooms/${roomId}`, { signal: controller.signal });
      const roomData = await roomRes.json();
      if (!roomRes.ok) { setError("Room not found"); return; }
      setRoom(roomData.room);
      const interviewId = roomData.room.interview?.id;
      if (interviewId) {
        const reportRes = await fetch(`/api/interviews/${interviewId}/report`, { signal: controller.signal });
        if (reportRes.ok) {
          const d = await reportRes.json();
          setReport(d.report);
          const r = d.report;
          if (r.rubricProblemSolving || r.rubricCommunication) {
            setRubric({
              problemSolving: r.rubricProblemSolving ?? 0,
              communication:  r.rubricCommunication  ?? 0,
              codeQuality:    r.rubricCodeQuality    ?? 0,
              edgeCases:      r.rubricEdgeCases      ?? 0,
              speed:          r.rubricSpeed          ?? 0,
            });
          }
          if (r.shareToken) setShareUrl(`${window.location.origin}/share/${r.shareToken}`);
        } else if (roomData.room.interview?.status === "completed") {
          // Report not ready yet — start polling
          setPolling(true);
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out");
        setError("Request timed out");
      } else {
        setError("Failed to load report");
      }
    } finally { 
      clearTimeout(timeoutId);
      setLoading(false); 
    }
  }, [roomId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll every 3s if the interview is completed but report not yet ready
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      const roomRes = await fetch(`/api/rooms/${roomId}`).catch(() => null);
      if (!roomRes?.ok) return;
      const roomData = await roomRes.json();
      const interviewId = roomData.room?.interview?.id;
      if (!interviewId) return;
      const reportRes = await fetch(`/api/interviews/${interviewId}/report`);
      if (reportRes.ok) {
        const d = await reportRes.json();
        setReport(d.report);
        setPolling(false);
        clearInterval(id);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [polling, roomId]);

  async function generateReport() {
    const interviewId = room?.interview?.id;
    if (!interviewId) return;
    setGenerating(true); setError("");
    const toastId = toast.loading("AI is analyzing the code...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const res = await fetch(`/api/interviews/${interviewId}/report`, { 
        method: "POST",
        signal: controller.signal 
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate report", { id: toastId });
        setError(data.error || "Failed to generate report");
        return;
      }
      toast.success("Report generated!", { id: toastId });
      setReport(data.report);
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Request timed out", { id: toastId });
        setError("Request timed out");
      } else {
        toast.error("Something went wrong. Please try again.", { id: toastId });
        setError("Something went wrong. Please try again.");
      }
    } finally { 
      clearTimeout(timeoutId);
      setGenerating(false); 
    }
  }

  async function saveRubric() {
    const interviewId = room?.interview?.id;
    if (!interviewId) return;
    await fetch(`/api/interviews/${interviewId}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rubric }),
    });
    toast.success("Rubric saved");
    setRubricSaved(true);
    setTimeout(() => setRubricSaved(false), 2000);
  }

  async function generateShareLink() {
    const interviewId = room?.interview?.id;
    if (!interviewId) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubric, recipientEmail: shareRecipient.trim() || undefined }),
      });
      const data = await res.json();
      if (data.shareToken) {
        const url = `${window.location.origin}/share/${data.shareToken}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Share link copied to clipboard!");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } finally { setSharing(false); }
  }

  async function downloadPDF() {
    const interviewId = room?.interview?.id;
    if (!interviewId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/report/pdf`);
      if (!res.ok) { toast.error("Failed to generate PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"$/)?.[1] || "report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
    finally { setDownloading(false); }
  }

  async function revokeShareLink() {
    const interviewId = room?.interview?.id;
    if (!interviewId) return;
    if (!confirm("Revoke this share link? Anyone with the current link will lose access.")) return;
    setRevoking(true);
    try {
      await fetch(`/api/interviews/${interviewId}/share`, { method: "DELETE" });
      setShareUrl("");
      toast.success("Share link revoked");
    } finally { setRevoking(false); }
  }

  async function deleteInterview() {
    const interviewId = room?.interview?.id;
    if (!interviewId) {
      toast.error("No interview found to delete.");
      return;
    }
    if (!confirm("Delete this interview and all its data? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Interview deleted"); router.push("/dashboard"); }
      else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Delete failed.");
      }
    } finally { setDeleting(false); }
  }

  const rec = useMemo(() => REC[recKey(report?.recommendation)] || REC.BORDERLINE, [report]);
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

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#04040f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error}</p>
          <a href="/dashboard" className="text-violet-400 hover:text-violet-300 text-sm">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  // ── No report yet ──
  if (!report) {
    return (
      <div className="min-h-screen bg-[#04040f] text-slate-200">
        <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
        <div className="dot-grid fixed inset-0 pointer-events-none opacity-30" />

        <nav className="sticky top-0 z-50 bg-[#04040f]/80 backdrop-blur-2xl border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 flex items-center gap-4 h-14">
            <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <span className="text-white font-semibold text-sm">{room?.title}</span>
          </div>
        </nav>

        <div className="relative z-10 max-w-2xl mx-auto px-6 py-24 text-center">
          {polling ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
              <h1 className="text-3xl font-black text-white mb-3">Generating AI Report</h1>
              <p className="text-slate-500 mb-4 leading-relaxed">AI is analyzing the code. This usually takes 10–20 seconds…</p>
              <div className="flex items-center justify-center gap-1.5">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl">🤖</div>
              <h1 className="text-3xl font-black text-white mb-3">Generate AI Report</h1>
              <p className="text-slate-500 mb-10 leading-relaxed">
                AI will analyze the code for correctness, complexity, edge cases, and quality — then give a hiring recommendation.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-10">
                {[
                  { label: "Problems", value: room?.problems?.length ? room.problems.map((rp) => rp.problem?.title).join(", ") : room?.problem?.title || "Free coding" },
                  { label: "Language", value: (room?.interview?.language || "—").toUpperCase() },
                  { label: "Duration", value: room?.interview?.duration ? `${Math.round(room.interview.duration / 60)}m` : "—" },
                ].map((m, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-left">
                    <div className="text-xs text-slate-600 uppercase tracking-widest mb-1">{m.label}</div>
                    <div className="text-white text-sm font-semibold truncate">{m.value}</div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">{error}</div>
              )}

              <button
                onClick={generateReport}
                disabled={generating}
                className="px-10 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-violet-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center gap-2 mx-auto"
              >
                {generating ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><RefreshCw size={18} /> Generate Report</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Full report ──
  return (
    <div className="min-h-screen bg-[#04040f] text-slate-200">
      <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
      <div className="dot-grid fixed inset-0 pointer-events-none opacity-30" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#04040f]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <span className="text-white font-semibold text-sm truncate max-w-[200px]">{room?.title}</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-500 text-xs">AI Report</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/room/${roomId}/playback`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-white/[0.07] hover:border-white/[0.14] rounded-lg transition-all"
            >
              <Play size={12} /> Playback
            </button>
            <button
              onClick={deleteInterview}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-400 border border-white/[0.07] hover:border-rose-500/30 rounded-lg transition-all disabled:opacity-40"
            >
              <Trash2 size={12} /> {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Verdict banner ── */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border ${rec.bg}`}>
          <div className="flex items-center gap-4">
            <RecIcon size={36} className={rec.color} />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">AI Suggestion</p>
              <h1 className={`text-3xl font-black ${rec.color}`}>{rec.label}</h1>
              <p className="text-xs text-slate-600 mt-1">This is an AI-generated suggestion, not a final decision.</p>
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

        {/* ── 2-col grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left col — scores + summary */}
          <div className="lg:col-span-2 space-y-5">

            {/* Score radar + bars */}
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
              <ScoreBar label="Correctness"       value={report.correctness}      color="bg-emerald-500" />
              <ScoreBar label="Code Quality"      value={report.codeQuality}      color="bg-violet-500" />
              <ScoreBar label="Edge Case Handling" value={report.edgeCaseHandling} color="bg-cyan-500" />
            </div>

            {/* Summary */}
            {report.summary && (
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Zap size={15} className="text-cyan-400" /> Summary
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">{report.summary}</p>
              </div>
            )}

            {/* Improvements */}
            {report.improvements && (
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <ChevronRight size={15} className="text-amber-400" /> Areas to Improve
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">{report.improvements}</p>
              </div>
            )}

            {/* Code snapshot */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Code2 size={15} className="text-slate-400" /> Final Code
                </h2>
                <span className="text-xs text-slate-600 font-mono">{room?.interview?.language}</span>
              </div>
              <pre className="p-5 overflow-x-auto max-h-72 text-xs text-emerald-300 font-mono leading-relaxed">
                <code>{room?.interview?.finalCode || "No code submitted."}</code>
              </pre>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-5">

            {/* Session info */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white mb-1">Session Info</h2>
              <MetricPill label="Problems" value={room?.problems?.length ? room.problems.map((rp) => rp.problem?.title).join(", ") : room?.problem?.title || "Free coding"} />
              <MetricPill label="Language" value={(room?.interview?.language || "—").toUpperCase()} />
              <MetricPill label="Duration" value={room?.interview?.duration ? `${Math.round(room.interview.duration / 60)}m` : "—"} />
            </div>

            {/* Interviewer rubric */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield size={14} className="text-violet-400" /> Your Rubric
                </h2>
                <button
                  onClick={saveRubric}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    rubricSaved
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.16]"
                  }`}
                >
                  {rubricSaved ? <><Check size={11} className="inline mr-1" />Saved</> : "Save"}
                </button>
              </div>
              {[
                { key: "problemSolving", label: "Problem Solving" },
                { key: "communication",  label: "Communication" },
                { key: "codeQuality",    label: "Code Quality" },
                { key: "edgeCases",      label: "Edge Cases" },
                { key: "speed",          label: "Speed" },
              ].map(({ key, label }) => (
                <RubricSlider
                  key={key}
                  label={label}
                  value={rubric[key]}
                  onChange={(v) => setRubric((p) => ({ ...p, [key]: v }))}
                />
              ))}
            </div>

            {/* Share */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Share Report</h2>
              <input
                type="email"
                placeholder="Send to email (optional)"
                value={shareRecipient}
                onChange={(e) => setShareRecipient(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
              />
              <button
                onClick={generateShareLink}
                disabled={sharing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                {copied ? <><Check size={15} /> Copied!</> : sharing ? "Generating…" : <><Share2 size={15} /> Generate Share Link</>}
              </button>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.14] text-slate-300 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                <Download size={15} /> {downloading ? "Generating PDF…" : "Download PDF"}
              </button>
              {shareUrl && (
                <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <span className="text-xs text-slate-500 flex-1 truncate">{shareUrl}</span>
                  <button
                    onClick={revokeShareLink}
                    disabled={revoking}
                    className="text-xs text-rose-400 hover:text-rose-300 flex-shrink-0 disabled:opacity-40"
                  >
                    {revoking ? "…" : "Revoke"}
                  </button>
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={deleteInterview}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
            >
              <Trash2 size={15} /> {deleting ? "Deleting…" : "Delete Interview"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
