"use client";

import { useState } from "react";
import { resolveProblems } from "@/lib/utils";

export default function TestCaseRunner({
  testCases,
  code,
  language,
  roomId,
  problemIndex = 0,
  onRunComplete,
  output,
  isRunning,
}) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("results");

  if (!testCases || testCases.length === 0) return null;

  // Candidate path: expected values are stripped from the payload, so we run
  // tests server-side and receive only pass/fail + actual output.
  const candidatePath = roomId && testCases.every((tc) => tc.expected === undefined);

  async function runTestCases() {
    setRunning(true);
    setResults([]);

    if (candidatePath) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`/api/rooms/${roomId}/run-tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, problemIndex }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) {
          setResults([{ testCase: 1, passed: false, input: null, actual: data.error || "Server error", error: true }]);
          setRunning(false);
          return;
        }
        const newResults = data.results.map((r, i) => ({
          testCase: i + 1,
          passed: r.passed,
          input: testCases[i]?.input,
          expected: undefined, // never shown to candidate
          actual: r.actual,
          error: !!r.error,
        }));
        setResults(newResults);
        if (onRunComplete) onRunComplete({ total: data.total, passed: data.passed, results: newResults });
      } catch {
        setResults([{ testCase: 1, passed: false, input: null, actual: "Execution failed", error: true }]);
      }
      setRunning(false);
      return;
    }

    // Owner / preview path: expected values are present, run client-side.
    const newResults = [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const wrappedCode = wrapCodeWithTest(code, language, tc);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: wrappedCode, language }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok || data.status === "error") {
          newResults.push({ testCase: i + 1, passed: false, input: tc.input, expected: tc.expected, actual: data.output || "Error", error: true });
        } else {
          const actual = data.output?.trim();
          newResults.push({ testCase: i + 1, passed: normalizedEqual(actual, tc.expected), input: tc.input, expected: tc.expected, actual, error: false });
        }
      } catch {
        newResults.push({ testCase: i + 1, passed: false, input: tc.input, expected: tc.expected, actual: "Execution failed", error: true });
      }
      setResults([...newResults]);
    }
    setRunning(false);
    const passed = newResults.filter((r) => r.passed).length;
    if (onRunComplete) onRunComplete({ total: newResults.length, passed, results: newResults });
  }

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="h-full bg-gray-900 border-t border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <button
            onClick={() => setActiveTab("results")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "results"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Test Results
            {results.length > 0 && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  passedCount === results.length
                    ? "bg-green-900/50 text-green-400"
                    : "bg-red-900/50 text-red-400"
                }`}
              >
                {passedCount}/{results.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("output")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "output"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Raw Output
          </button>
        </div>

        <button
          onClick={runTestCases}
          disabled={running}
          className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center gap-2 ${
            running
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {running ? (
            <>
              <svg
                className="animate-spin h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Running Tests...
            </>
          ) : (
            "🧪 Run Tests"
          )}
        </button>
        {!["javascript", "typescript", "python", "cpp", "c", "java", "go", "rust"].includes(language) && (
          <span className="text-xs text-amber-400">
            ⚠ Automated test comparison only available for JS/TS/Python/C++/C/Java/Go/Rust
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "output" && (
          <>
            {isRunning && (
              <div className="flex items-center gap-2 text-slate-500 text-xs p-4">
                <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                Executing code…
              </div>
            )}

            {!isRunning && !output && (
              <p className="text-slate-700 text-xs p-4">Press Run to execute your code</p>
            )}

            {!isRunning && output && (
              <div className="p-4">
                <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed p-3 rounded-lg border ${
                  output.status === "error"
                    ? "text-rose-300 bg-rose-500/5 border-rose-500/15"
                    : "text-emerald-300 bg-emerald-500/5 border-emerald-500/15"
                }`}>
                  {output.output || "(no output)"}
                </pre>
              </div>
            )}
          </>
        )}

        {activeTab === "results" && (
          <>
            {results.length === 0 && !running && (
              <p className="text-gray-500 text-sm text-center mt-4">
                Click &quot;Run Tests&quot; to validate your solution against sample test cases
              </p>
            )}

            {running && results.length === 0 && (
              <div className="flex items-center justify-center mt-8">
                <div className="text-center">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-400 mx-auto mb-3"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-gray-400 text-sm">Running test cases...</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.testCase}
                  className={`rounded-lg border p-4 ${
                    result.passed
                      ? "bg-green-900/10 border-green-800/50"
                      : "bg-red-900/10 border-red-800/50"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">
                      Test Case {result.testCase}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        result.passed
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {result.passed ? "✅ PASSED" : "❌ FAILED"}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Input:</span>
                      <pre className="text-gray-300 bg-gray-800/50 p-2 rounded mt-1 text-xs overflow-x-auto">
                        {result.input ? JSON.stringify(result.input, null, 2) : "—"}
                      </pre>
                    </div>
                    {result.expected !== undefined && (
                      <div>
                        <span className="text-gray-500 text-xs">Expected:</span>
                        <pre className="text-blue-300 bg-gray-800/50 p-2 rounded mt-1 text-xs">
                          {JSON.stringify(result.expected)}
                        </pre>
                      </div>
                    )}
                    {!result.passed && (
                      <div>
                        <span className="text-gray-500 text-xs">Got:</span>
                        <pre
                          className={`p-2 rounded mt-1 text-xs ${
                            result.error
                              ? "text-red-300 bg-red-900/20"
                              : "text-yellow-300 bg-gray-800/50"
                          }`}
                        >
                          {result.actual}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {results.length > 0 && !running && (
              <div
                className={`mt-4 p-4 rounded-lg text-center ${
                  passedCount === results.length
                    ? "bg-green-900/20 border border-green-800/50"
                    : "bg-yellow-900/20 border border-yellow-800/50"
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    passedCount === results.length
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {passedCount === results.length
                    ? "🎉 All Test Cases Passed!"
                    : `${passedCount}/${results.length} Test Cases Passed`}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Normalize and deep-compare actual stdout string vs expected value
function normalizedEqual(actual, expected) {
  try {
    const parsedActual = JSON.parse(actual);
    // For arrays: sort both if order doesn't matter? No — keep order-sensitive.
    // Just deep-equal via re-serialization after sorting arrays of primitives
    return deepEqual(parsedActual, expected);
  } catch {
    // Fallback: string compare
    return actual === String(expected);
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && a !== null && b !== null) {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.join() === kb.join() && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

// Wrap user's code to run with test input and output result
function wrapCodeWithTest(code, language, testCase) {
  if (language === "javascript" || language === "typescript") {
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) {
      return wrapClassTest(code, testCase);
    }
    // Arrow function: const twoSum = (nums, target) => ...
    const arrowMatch = code.match(/const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
    const match = funcMatch || arrowMatch;
    if (match) {
      const funcName = match[1];
      const args = Object.values(testCase.input);
      const argsStr = args.map((a) => JSON.stringify(a)).join(", ");
      // Some functions mutate in-place and return void (e.g. reverseString)
      // Capture the first argument to handle both cases
      const firstArgName = "__arg0";
      const firstArgVal = JSON.stringify(args[0]);
      const restArgs = args.slice(1).map((a) => JSON.stringify(a)).join(", ");
      const callArgs = args.length > 1 ? `${firstArgName}, ${restArgs}` : firstArgName;
      return `${code}\n\nconst ${firstArgName} = ${firstArgVal};\nconst __result = ${funcName}(${callArgs});\nconsole.log(JSON.stringify(__result !== undefined ? __result : ${firstArgName}));`;
    }
    return code;
  }

  if (language === "python") {
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) {
      return wrapPythonClassTest(code, testCase);
    }
    const funcMatch = code.match(/def\s+(\w+)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const args = Object.values(testCase.input);
      const firstArgVal = JSON.stringify(args[0]);
      const restArgs = args.slice(1).map((a) => JSON.stringify(a)).join(", ");
      const callArgs = args.length > 1 ? `__arg0, ${restArgs}` : "__arg0";
      return `import json\n${code}\n\n__arg0 = ${firstArgVal}\n__result = ${funcName}(${callArgs})\nprint(json.dumps(__result if __result is not None else __arg0))`;
    }
    return code;
  }

  if (language === "cpp" || language === "c") {
    // For C++, we'll use a simpler approach - just run the code as-is
    // The test runner will handle the wrapping
    return code;
  }

  if (language === "java") {
    // For Java, run as-is and let test runner handle it
    return code;
  }

  if (language === "go") {
    // For Go, run as-is
    return code;
  }

  if (language === "rust") {
    // For Rust, run as-is
    return code;
  }

  // Unsupported language — return code with a clear message
  console.warn(`[TestCaseRunner] Test wrapping not supported for ${language}`);
  return code;
}

function wrapClassTest(code, testCase) {
  const { operations, values } = testCase.input;
  if (!operations || !values) return code;
  const className = operations[0];
  return `${code}

const __ops = ${JSON.stringify(operations)};
const __vals = ${JSON.stringify(values)};
const __out = [];
let __obj = null;
for (let i = 0; i < __ops.length; i++) {
  if (i === 0) { __obj = new ${className}(...__vals[i]); __out.push(null); }
  else { const r = __obj[__ops[i]](...__vals[i]); __out.push(r === undefined ? null : r); }
}
console.log(JSON.stringify(__out));`;
}

function wrapPythonClassTest(code, testCase) {
  const { operations, values } = testCase.input;
  if (!operations || !values) return code;
  const className = operations[0];
  return `import json
${code}

__ops = ${JSON.stringify(operations)}
__vals = ${JSON.stringify(values)}
__out = []
__obj = None
for i in range(len(__ops)):
    if i == 0:
        __obj = ${className}(*__vals[i])
        __out.append(None)
    else:
        r = getattr(__obj, __ops[i])(*__vals[i])
        __out.append(r)
print(json.dumps(__out))`;
}