"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const REC_STYLES = {
  STRONG_HIRE: {
    bg: "bg-green-900/30",
    text: "text-green-400",
    border: "border-green-800",
    label: "STRONG HIRE",
    emoji: "🌟",
    bar: "bg-green-500",
  },
  HIRE: {
    bg: "bg-blue-900/30",
    text: "text-blue-400",
    border: "border-blue-800",
    label: "HIRE",
    emoji: "✅",
    bar: "bg-blue-500",
  },
  BORDERLINE: {
    bg: "bg-yellow-900/30",
    text: "text-yellow-400",
    border: "border-yellow-800",
    label: "BORDERLINE",
    emoji: "⚠️",
    bar: "bg-yellow-500",
  },
  NO_HIRE: {
    bg: "bg-red-900/30",
    text: "text-red-400",
    border: "border-red-800",
    label: "NO HIRE",
    emoji: "❌",
    bar: "bg-red-500",
  },
};

function ScoreBar({ label, score, max = 10 }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-bold text-white">{score}/{max}</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FormattedText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </p>
  );
}

export default function ReportPage() {
  const { roomId } = useParams();

  const [room, setRoom] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      const roomData = await roomRes.json();

      if (!roomRes.ok) {
        setError("Room not found");
        return;
      }

      setRoom(roomData.room);

      const interviewId = roomData.room.interview?.id;
      if (interviewId) {
        const repRes = await fetch(`/api/interviews/${interviewId}/report`);
        if (repRes.ok) {
          const repData = await repRes.json();
          setReport(repData.report);
        }
        // 404 just means no report yet — that's fine
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    const interviewId = room?.interview?.id;
    if (!interviewId) return;

    setGenerating(true);
    setError("");

    try {
      const res = await fetch(`/api/interviews/${interviewId}/report`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate report");
        return;
      }

      setReport(data.report);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-gray-400 text-lg">Loading report...</div>
      </div>
    );
  }

  // ── Hard error (room not found etc) ─────────────────────────────────────
  if (error && !room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
          <a href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ── No report yet — show generate prompt ────────────────────────────────
  if (!report) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">AI Evaluation</h1>
              <p className="text-gray-400 mt-1">{room?.title}</p>
            </div>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all border border-gray-700"
            >
              Dashboard
            </a>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-6">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to Generate AI Report
            </h2>
            <p className="text-gray-400 mb-2">
              AI will analyze the candidate&apos;s code and generate a detailed evaluation.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Includes correctness, code quality, complexity analysis, and a hiring recommendation.
            </p>

            <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
              {room?.problem && (
                <div className="text-sm">
                  <span className="text-gray-500">Problem: </span>
                  <span className="text-blue-400">{room.problem.title}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-gray-500">Language: </span>
                <span className="text-white">{room?.interview?.language}</span>
              </div>
              {room?.interview?.duration && (
                <div className="text-sm">
                  <span className="text-gray-500">Duration: </span>
                  <span className="text-white">
                    {Math.round(room.interview.duration / 60)} min
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={generateReport}
              disabled={generating}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                generating
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  AI is analyzing the code...
                </span>
              ) : (
                "🤖 Generate AI Report"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Report exists — display it ───────────────────────────────────────────
  const rec = REC_STYLES[report.recommendation] || REC_STYLES.BORDERLINE;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Evaluation Report</h1>
            <p className="text-gray-400 mt-1">{room?.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/room/${roomId}/playback`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all border border-gray-700"
            >
              🎬 Playback
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all border border-gray-700"
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* Recommendation Banner */}
        <div className={`${rec.bg} ${rec.border} border rounded-xl p-8 mb-8 text-center`}>
          <div className="text-5xl mb-3">{rec.emoji}</div>
          <h2 className={`text-3xl font-bold ${rec.text} mb-2`}>{rec.label}</h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${rec.bar} rounded-full transition-all duration-1000`}
                style={{ width: `${report.overallScore}%` }}
              />
            </div>
            <span className="text-gray-300 text-sm font-medium">
              {report.overallScore}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Scores */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Scores</h3>
            <ScoreBar label="Correctness" score={report.correctness} />
            <ScoreBar label="Code Quality" score={report.codeQuality} />
            <ScoreBar label="Edge Case Handling" score={report.edgeCaseHandling} />
            <ScoreBar label="Overall Score" score={report.overallScore} max={100} />
          </div>

          {/* Complexity + Meta */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Complexity Analysis</h3>
            <div className="space-y-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <span className="text-gray-400 text-xs uppercase tracking-wide">Time Complexity</span>
                <p className="text-2xl font-bold text-white mt-1 font-mono">{report.timeComplexity}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <span className="text-gray-400 text-xs uppercase tracking-wide">Space Complexity</span>
                <p className="text-2xl font-bold text-white mt-1 font-mono">{report.spaceComplexity}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm border-t border-gray-800 pt-4">
              {room?.problem && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Problem</span>
                  <span className="text-blue-400">{room.problem.title}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Language</span>
                <span className="text-white capitalize">{room?.interview?.language}</span>
              </div>
              {room?.interview?.duration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-white">{Math.round(room.interview.duration / 60)} min</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Detailed Analysis</h3>
          <FormattedText text={report.summary} />
        </div>

        {/* Improvements */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">💡 Suggested Improvements</h3>
          <FormattedText text={report.improvements} />
        </div>

        {/* Submitted Code */}
        {room?.interview?.finalCode && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📝 Submitted Code</h3>
            <pre className="bg-gray-800 p-4 rounded-lg text-green-300 text-sm overflow-x-auto leading-relaxed">
              <code>{room.interview.finalCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
