"use client";

import { ExternalLink, TrendingDown } from "lucide-react";

const RESOURCES = {
  "time complexity": {
    label: "Big-O Complexity",
    url: "https://www.bigocheatsheet.com/",
  },
  "space complexity": {
    label: "Space Complexity Guide",
    url: "https://www.geeksforgeeks.org/g-fact-86/",
  },
  recursion: {
    label: "Recursion Patterns",
    url: "https://leetcode.com/explore/learn/card/recursion-i/",
  },
  "dynamic programming": {
    label: "DP Patterns",
    url: "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns",
  },
  "binary search": {
    label: "Binary Search",
    url: "https://leetcode.com/explore/learn/card/binary-search/",
  },
  "linked list": {
    label: "Linked Lists",
    url: "https://leetcode.com/explore/learn/card/linked-list/",
  },
  tree: {
    label: "Trees & Traversals",
    url: "https://leetcode.com/explore/learn/card/data-structure-tree/",
  },
  graph: {
    label: "Graph Algorithms",
    url: "https://leetcode.com/explore/learn/card/graph/",
  },
  "edge case": {
    label: "Edge Case Testing",
    url: "https://www.geeksforgeeks.org/software-testing-boundary-value-analysis/",
  },
  "code quality": {
    label: "Clean Code Principles",
    url: "https://refactoring.guru/refactoring",
  },
  communication: {
    label: "Technical Communication",
    url: "https://www.techinterviewhandbook.org/behavioral-interview/",
  },
  "problem solving": {
    label: "Problem Solving Framework",
    url: "https://www.techinterviewhandbook.org/coding-interview-techniques/",
  },
};

const TOPIC_KEYWORDS = Object.keys(RESOURCES);

function detectGapTopics(improvements) {
  if (!improvements) return [];
  const lower = improvements.toLowerCase();
  return TOPIC_KEYWORDS.filter((kw) => lower.includes(kw));
}

function ScoreBar({ label, value, max = 10, color = "bg-violet-500" }) {
  const pct = Math.round((Math.min(Math.max(Number(value) || 0, 0), max) / max) * 100);
  const scoreColor =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs">{label}</span>
        <span className="text-white text-xs font-semibold">{value ?? "—"}/{max}</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full ${scoreColor} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SkillGapPanel({ report }) {
  if (!report) return null;

  const scores = [
    { label: "Technical",       value: report.technicalScore      ?? report.correctness },
    { label: "Communication",   value: report.communicationScore  ?? null },
    { label: "Problem Solving", value: report.problemSolvingScore ?? null },
    { label: "Code Quality",    value: report.codeQualityScore    ?? report.codeQuality },
  ].filter((s) => s.value != null);

  const gapTopics = detectGapTopics(
    Array.isArray(report.improvements)
      ? report.improvements.join(" ")
      : report.improvements || ""
  );

  const improvementsArr = Array.isArray(report.improvements)
    ? report.improvements
    : report.improvements
    ? [report.improvements]
    : [];

  if (scores.length === 0 && improvementsArr.length === 0) return null;

  return (
    <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <TrendingDown size={15} className="text-rose-400" /> Skill Gap Analysis
      </h2>

      {scores.length > 0 && (
        <div className="space-y-3">
          {scores.map((s) => (
            <ScoreBar key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}

      {improvementsArr.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Areas to Improve
          </p>
          <ul className="space-y-2">
            {improvementsArr.map((item, i) => {
              const lower = item.toLowerCase();
              const match = TOPIC_KEYWORDS.find((kw) => lower.includes(kw));
              const resource = match ? RESOURCES[match] : null;
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs leading-relaxed">{item}</p>
                    {resource && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <ExternalLink size={10} />
                        {resource.label}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {gapTopics.length > 0 && improvementsArr.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Suggested Resources
          </p>
          <div className="flex flex-wrap gap-2">
            {gapTopics.map((topic) => {
              const r = RESOURCES[topic];
              return (
                <a
                  key={topic}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-full hover:bg-violet-500/20 transition-all"
                >
                  <ExternalLink size={10} />
                  {r.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
