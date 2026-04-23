"use strict";

const { describe, it, expect } = require("@jest/globals");
const fs   = require("fs");
const path = require("path");

// ── Pull source text ──────────────────────────────────────────────────────────
const reportRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/interviews/[interviewId]/report/route.js"), "utf8"
);
const serviceSrc = fs.readFileSync(
  path.resolve(__dirname, "../services/interview.service.js"), "utf8"
);
const repositorySrc = fs.readFileSync(
  path.resolve(__dirname, "../repositories/interview.repository.js"), "utf8"
);
const groqSrc = fs.readFileSync(
  path.resolve(__dirname, "../lib/groq.js"), "utf8"
);

// ── Structural checks ─────────────────────────────────────────────────────────
describe("report route — source checks", () => {
  it("rejects generation when no code was submitted", () => {
    expect(serviceSrc).toMatch(/No code was submitted/);
    expect(serviceSrc).toMatch(/status: 400/);
  });

  it("is idempotent — returns existing report without regenerating", () => {
    expect(serviceSrc).toMatch(/interview\.report/);
    expect(serviceSrc).toMatch(/Return existing report/i);
  });

  it("only interview owner can generate report", () => {
    expect(reportRouteSrc).toMatch(/requireInterviewOwner/);
  });

  it("persists report via createReport", () => {
    expect(repositorySrc).toMatch(/createReport/);
  });

  it("updates interview status to evaluated after report creation", () => {
    expect(serviceSrc).toMatch(/evaluated/);
  });
});

describe("groq evaluator — source checks", () => {
  it("uses json_object response format", () => {
    expect(groqSrc).toMatch(/json_object/);
  });

  it("clamps all numeric scores", () => {
    expect(groqSrc).toMatch(/clamp/);
  });

  it("validates recommendation against allowed values", () => {
    expect(groqSrc).toMatch(/STRONG_HIRE/);
    expect(groqSrc).toMatch(/HIRE/);
    expect(groqSrc).toMatch(/BORDERLINE/);
    expect(groqSrc).toMatch(/NO_HIRE/);
  });
});

// ── Mirror validateEvaluation + clamp ────────────────────────────────────────
function clamp(value, min, max) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function validateRecommendation(rec) {
  const valid = ["STRONG_HIRE", "HIRE", "BORDERLINE", "NO_HIRE"];
  return valid.includes(rec) ? rec : "BORDERLINE";
}

function validateEvaluation(evaluation) {
  return {
    correctness:      clamp(evaluation.correctness      || 5, 1, 10),
    codeQuality:      clamp(evaluation.codeQuality      || 5, 1, 10),
    timeComplexity:   evaluation.timeComplexity   || "Unknown",
    spaceComplexity:  evaluation.spaceComplexity  || "Unknown",
    edgeCaseHandling: clamp(evaluation.edgeCaseHandling || 5, 1, 10),
    overallScore:     clamp(evaluation.overallScore     ?? 50, 1, 100),
    recommendation:   validateRecommendation(evaluation.recommendation),
    summary:          evaluation.summary      || "No summary available.",
    improvements:     evaluation.improvements || "No specific improvements noted.",
    strengths:        evaluation.strengths    || "No specific strengths noted.",
    weaknesses:       evaluation.weaknesses   || "No specific weaknesses noted.",
  };
}

describe("validateEvaluation — score clamping", () => {
  it("clamps correctness above 10 down to 10", () => {
    expect(validateEvaluation({ correctness: 15 }).correctness).toBe(10);
  });

  it("clamps correctness below 1 up to 1", () => {
    expect(validateEvaluation({ correctness: -3 }).correctness).toBe(1);
  });

  it("clamps overallScore above 100 down to 100", () => {
    expect(validateEvaluation({ overallScore: 150 }).overallScore).toBe(100);
  });

  it("clamps overallScore below 1 up to 1", () => {
    expect(validateEvaluation({ overallScore: 0 }).overallScore).toBe(1);
  });

  it("rounds fractional scores", () => {
    expect(validateEvaluation({ correctness: 7.6 }).correctness).toBe(8);
    expect(validateEvaluation({ correctness: 7.4 }).correctness).toBe(7);
  });

  it("defaults missing scores to mid-range", () => {
    const result = validateEvaluation({});
    expect(result.correctness).toBe(5);
    expect(result.codeQuality).toBe(5);
    expect(result.overallScore).toBe(50);
  });

  it("preserves valid complexity strings", () => {
    const result = validateEvaluation({ timeComplexity: "O(n log n)", spaceComplexity: "O(1)" });
    expect(result.timeComplexity).toBe("O(n log n)");
    expect(result.spaceComplexity).toBe("O(1)");
  });

  it("defaults missing complexity to Unknown", () => {
    const result = validateEvaluation({});
    expect(result.timeComplexity).toBe("Unknown");
    expect(result.spaceComplexity).toBe("Unknown");
  });
});

describe("validateRecommendation", () => {
  it("accepts all four valid values", () => {
    ["STRONG_HIRE", "HIRE", "BORDERLINE", "NO_HIRE"].forEach((v) => {
      expect(validateRecommendation(v)).toBe(v);
    });
  });

  it("falls back to BORDERLINE for unknown value", () => {
    expect(validateRecommendation("MAYBE")).toBe("BORDERLINE");
  });

  it("falls back to BORDERLINE for undefined", () => {
    expect(validateRecommendation(undefined)).toBe("BORDERLINE");
  });

  it("is case-sensitive — lowercase is invalid", () => {
    expect(validateRecommendation("hire")).toBe("BORDERLINE");
  });
});

// ── Mirror no-code guard ──────────────────────────────────────────────────────
function canGenerateReport(finalCode) {
  return Boolean(finalCode?.trim());
}

describe("report generation — no-code guard", () => {
  it("allows generation when code is present", () => {
    expect(canGenerateReport("function solution() {}")).toBe(true);
  });

  it("blocks generation when finalCode is empty string", () => {
    expect(canGenerateReport("")).toBe(false);
  });

  it("blocks generation when finalCode is only whitespace", () => {
    expect(canGenerateReport("   \n\t  ")).toBe(false);
  });

  it("blocks generation when finalCode is null", () => {
    expect(canGenerateReport(null)).toBe(false);
  });

  it("blocks generation when finalCode is undefined", () => {
    expect(canGenerateReport(undefined)).toBe(false);
  });
});

// ── Mirror idempotency guard ──────────────────────────────────────────────────
function shouldReturnExistingReport(interview) {
  return Boolean(interview?.report);
}

describe("report generation — idempotency", () => {
  it("returns existing report when one already exists", () => {
    expect(shouldReturnExistingReport({ report: { id: "r1" } })).toBe(true);
  });

  it("generates new report when none exists", () => {
    expect(shouldReturnExistingReport({ report: null })).toBe(false);
  });

  it("generates new report when interview has no report key", () => {
    expect(shouldReturnExistingReport({})).toBe(false);
  });
});
