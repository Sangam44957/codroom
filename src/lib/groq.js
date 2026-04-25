import Groq from "groq-sdk";
import { groqBreaker, CircuitBreakerOpenError } from "./circuitBreaker";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function isRetryable(error) {
  const status = error?.status ?? error?.statusCode;
  // Retry on rate limit (429), server errors (5xx), or network failures
  return !status || status === 429 || status >= 500;
}

export async function evaluateCode({
  code,
  language,
  problems,
  duration,
  testResults,
}) {
  const prompt = buildEvaluationPrompt({
    code,
    language,
    problems,
    duration,
    testResults,
  });

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await groqBreaker.execute(() =>
        groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an expert technical interviewer and code reviewer. 
You evaluate coding interview submissions with precision and fairness.
You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        })
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      const evaluation = JSON.parse(content);
      return validateEvaluation(evaluation);
    } catch (error) {
      // Don't retry if the circuit is open — propagate immediately
      if (error instanceof CircuitBreakerOpenError) throw error;
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      break;
    }
  }

  console.error("AI evaluation failed after retries:", lastError);
  throw lastError;
}

function buildEvaluationPrompt({
  code,
  language,
  problems,
  duration,
  testResults,
}) {
  const durationMinutes = duration ? Math.round(duration / 60) : "unknown";

  const problemSection = problems?.length
    ? problems.map((p, i) =>
        `### Problem ${i + 1}: ${p.title}\n${p.description || ""}`
      ).join("\n\n")
    : "Free coding (no specific problem)";

  const testSection = testResults
    ? `\n## Test Results (from automated runner)\nPassed: ${testResults.passed}/${testResults.total}\n${testResults.results?.map((r, i) => `Test ${i+1}: ${r.passed ? "PASSED" : `FAILED — expected ${JSON.stringify(r.expected)}, got ${r.actual}`}`).join("\n") || ""}\n\nIMPORTANT: The automated test results above are ground truth. Base your correctness score primarily on these results, not your own interpretation of the code.`
    : "";

  return `
Evaluate this coding interview submission.

## Problems
${problemSection}
${testSection}

## Submission
Language: ${language}
Time taken: ${durationMinutes} minutes

Code:
\`\`\`${language}
${code}
\`\`\`

## Evaluation Instructions

Analyze the code and return a JSON object with these exact fields:

{
  "correctness": <number 1-10>,
  "codeQuality": <number 1-10>,
  "timeComplexity": "<string like O(n), O(n log n), O(n^2), etc>",
  "spaceComplexity": "<string like O(1), O(n), etc>",
  "edgeCaseHandling": <number 1-10>,
  "overallScore": <number 1-100>,
  "recommendation": "<exactly one of: STRONG_HIRE, HIRE, BORDERLINE, NO_HIRE>",
  "summary": "<2-3 paragraph detailed analysis of the solution>",
  "improvements": "<specific suggestions for improvement>",
  "strengths": "<what the candidate did well>",
  "weaknesses": "<what the candidate could improve>"
}

## Scoring Guidelines

correctness (1-10):
- 10: Perfect solution, handles all cases
- 7-9: Mostly correct, minor issues
- 4-6: Partially correct, some bugs
- 1-3: Mostly incorrect or incomplete

codeQuality (1-10):
- 10: Clean, readable, well-structured
- 7-9: Good quality, minor style issues
- 4-6: Average, some readability concerns
- 1-3: Poor quality, hard to read

edgeCaseHandling (1-10):
- 10: All edge cases handled
- 7-9: Most edge cases handled
- 4-6: Some edge cases missed
- 1-3: No edge case consideration

overallScore (1-100):
- 85-100: Exceptional performance
- 70-84: Strong performance
- 55-69: Acceptable performance
- 40-54: Below expectations
- 1-39: Poor performance

recommendation:
- STRONG_HIRE: Score 85+, exceptional solution
- HIRE: Score 70-84, solid solution
- BORDERLINE: Score 55-69, needs discussion
- NO_HIRE: Score below 55, significant issues

Be fair but thorough. Consider the problem difficulty and time taken.
If no specific problem was given, evaluate the code on its own merit.
`;
}

function validateEvaluation(evaluation) {
  const correctness = clamp(evaluation.correctness || 5, 1, 10);
  const codeQuality = clamp(evaluation.codeQuality || 5, 1, 10);
  const edgeCaseHandling = clamp(evaluation.edgeCaseHandling || 5, 1, 10);
  
  // Calculate overall score based on individual scores if AI provided inconsistent data
  let overallScore = clamp(evaluation.overallScore ?? 50, 1, 100);
  
  // Validate overall score against individual scores
  const avgIndividualScore = (correctness + codeQuality + edgeCaseHandling) / 3;
  const expectedOverallScore = Math.round(avgIndividualScore * 10);
  
  // If overall score is inconsistent with individual scores, recalculate
  if (Math.abs(overallScore - expectedOverallScore) > 20) {
    overallScore = expectedOverallScore;
  }
  
  // Ensure recommendation matches overall score
  let recommendation = validateRecommendation(evaluation.recommendation);
  if (overallScore >= 85 && !["STRONG_HIRE", "HIRE"].includes(recommendation)) {
    recommendation = "STRONG_HIRE";
  } else if (overallScore >= 70 && !["STRONG_HIRE", "HIRE"].includes(recommendation)) {
    recommendation = "HIRE";
  } else if (overallScore >= 55 && recommendation === "NO_HIRE") {
    recommendation = "BORDERLINE";
  } else if (overallScore < 55 && !["NO_HIRE", "BORDERLINE"].includes(recommendation)) {
    recommendation = "NO_HIRE";
  }

  return {
    correctness,
    codeQuality,
    timeComplexity: evaluation.timeComplexity || "Unknown",
    spaceComplexity: evaluation.spaceComplexity || "Unknown",
    edgeCaseHandling,
    overallScore,
    recommendation,
    summary: evaluation.summary || "No summary available.",
    improvements: evaluation.improvements || "No specific improvements noted.",
    strengths: evaluation.strengths || "No specific strengths noted.",
    weaknesses: evaluation.weaknesses || "No specific weaknesses noted.",
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function validateRecommendation(rec) {
  const valid = ["STRONG_HIRE", "HIRE", "BORDERLINE", "NO_HIRE"];
  return valid.includes(rec) ? rec : "BORDERLINE";
}
