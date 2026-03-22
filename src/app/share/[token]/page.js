"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function SharedReportPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load report"));
  }, [token]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-white text-lg">{error}</p>
          <a href="/dashboard" className="text-blue-400 text-sm mt-4 block">Go to CodRoom</a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-gray-400">Loading report...</div>
      </div>
    );
  }

  const { report, meta } = data;

  const recColor = {
    STRONG_HIRE: "text-emerald-400",
    HIRE: "text-cyan-400",
    BORDERLINE: "text-yellow-400",
    NO_HIRE: "text-red-400",
  }[report.recommendation?.toUpperCase().replace(/\s+/g, "_")] || "text-yellow-400";

  const rubricItems = [
    { label: "Problem Solving", value: report.rubricProblemSolving },
    { label: "Communication",   value: report.rubricCommunication },
    { label: "Code Quality",    value: report.rubricCodeQuality },
    { label: "Edge Cases",      value: report.rubricEdgeCases },
    { label: "Speed",           value: report.rubricSpeed },
  ];
  const hasRubric = rubricItems.some((r) => r.value > 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-blue-400 text-xs uppercase tracking-widest mb-1">CodRoom · Shared Report</p>
        <h1 className="text-2xl font-bold">{meta.roomTitle}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
          {meta.problemTitle && <span>📋 {meta.problemTitle}</span>}
          {meta.language && <span>💻 {meta.language.toUpperCase()}</span>}
          {meta.duration && <span>⏱ {Math.round(meta.duration / 60)} min</span>}
          {meta.candidateName && <span>👤 {meta.candidateName}</span>}
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Verdict</p>
        <p className={`text-3xl font-bold ${recColor}`}>
          {report.recommendation?.replace(/_/g, " ")}
        </p>
        <p className="text-gray-400 text-sm mt-1">Overall Score: {report.overallScore}/100</p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Correctness",       value: report.correctness },
          { label: "Code Quality",      value: report.codeQuality },
          { label: "Edge Case Handling",value: report.edgeCaseHandling },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}<span className="text-gray-500 text-sm">/10</span></p>
            <div className="mt-2 h-1.5 bg-gray-800 rounded-full">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${value * 10}%` }} />
            </div>
          </div>
        ))}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Time Complexity</p>
          <p className="text-lg font-bold font-mono">{report.timeComplexity}</p>
          <p className="text-xs text-gray-500 mt-1">Space: {report.spaceComplexity}</p>
        </div>
      </div>

      {/* Interviewer Rubric */}
      {hasRubric && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Interviewer Rubric</p>
          <div className="space-y-2">
            {rubricItems.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-36">{label}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${value * 10}%` }} />
                </div>
                <span className="text-sm text-white w-8 text-right">{value}/10</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Summary</p>
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{report.summary}</p>
      </div>

      {/* Improvements */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Improvements</p>
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{report.improvements}</p>
      </div>

      <p className="text-center text-gray-600 text-xs mt-8">Generated by CodRoom · codroom.app</p>
    </div>
  );
}
