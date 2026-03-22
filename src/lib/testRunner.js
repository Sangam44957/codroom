import { submitCode } from "./judge0";

const SUITE_TIMEOUT_MS = 60_000; // overall cap: 60s regardless of test count

export async function runTestsForReport(code, language, testCases) {
  const results = [];
  const suiteDeadline = Date.now() + SUITE_TIMEOUT_MS;

  for (const tc of testCases) {
    if (Date.now() >= suiteDeadline) {
      results.push({ passed: false, expected: tc.expected, actual: "Suite timeout — too many test cases" });
      continue;
    }
    try {
      const wrapped = wrapCode(code, language, tc);
      const raw = await submitCode(wrapped, language);

      if (raw.stderr?.trim() || (raw.error && raw.error !== "TLE")) {
        results.push({ passed: false, expected: tc.expected, actual: raw.stderr?.trim() || raw.error });
        continue;
      }

      const actual = raw.stdout?.trim();
      results.push({ passed: normalizedEqual(actual, tc.expected), expected: tc.expected, actual });
    } catch (e) {
      results.push({ passed: false, expected: tc.expected, actual: "Execution error: " + e.message });
    }
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    results,
  };
}

function normalizedEqual(actual, expected) {
  try {
    return deepEqual(JSON.parse(actual), expected);
  } catch {
    return actual === String(expected);
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    if (a.every((v, i) => deepEqual(v, b[i]))) return true;
    // Try sorted comparison for problems where order doesn't matter (e.g. Two Sum)
    const sort = (arr) => [...arr].sort((x, y) => (JSON.stringify(x) > JSON.stringify(y) ? 1 : -1));
    return sort(a).every((v, i) => deepEqual(v, sort(b)[i]));
  }
  if (typeof a === "object" && a && b) {
    const ka = Object.keys(a).sort();
    return ka.join() === Object.keys(b).sort().join() && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function wrapCode(code, language, testCase) {
  if (language === "javascript" || language === "typescript") {
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) return wrapClassJS(code, testCase);

    const funcMatch =
      code.match(/(?:async\s+)?function\s+(\w+)/) ||
      code.match(/const\s+(\w+)\s*=\s*(?:async\s*)?[\(\w]/);

    if (funcMatch) {
      const funcName = funcMatch[1];
      const args = Object.values(testCase.input);
      const firstArgVal = JSON.stringify(args[0]);
      const restArgs = args.slice(1).map((a) => JSON.stringify(a)).join(", ");
      const callArgs = args.length > 1 ? `__arg0, ${restArgs}` : "__arg0";
      return `${code}\nconst __arg0 = ${firstArgVal};\nconst __r = ${funcName}(${callArgs});\nconsole.log(JSON.stringify(__r !== undefined ? __r : __arg0));`;
    }
    // No recognisable function found — emit a clear error instead of running raw code
    return `console.error("Test runner: no function or class detected in submitted code."); process.exit(1);`;
  }

  if (language === "python") {
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) return wrapClassPython(code, testCase);

    const funcMatch = code.match(/def\s+(\w+)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const args = Object.values(testCase.input);
      const firstArgVal = JSON.stringify(args[0]);
      const restArgs = args.slice(1).map((a) => JSON.stringify(a)).join(", ");
      const callArgs = args.length > 1 ? `__arg0, ${restArgs}` : "__arg0";
      return `import json\n${code}\n__arg0 = ${firstArgVal}\n__r = ${funcName}(${callArgs})\nprint(json.dumps(__r if __r is not None else __arg0))`;
    }
    // No recognisable function found
    return `import sys\nprint("Test runner: no function or class detected in submitted code.", file=sys.stderr)\nsys.exit(1)`;
  }

  return code;
}

function wrapClassJS(code, testCase) {
  const { operations, values } = testCase.input;
  if (!operations || !values) return code;
  const cls = operations[0];
  return `${code}
const __ops=${JSON.stringify(operations)},__vals=${JSON.stringify(values)},__out=[];
let __o=null;
for(let i=0;i<__ops.length;i++){
  if(i===0){__o=new ${cls}(...__vals[i]);__out.push(null);}
  else{const r=__o[__ops[i]](...__vals[i]);__out.push(r===undefined?null:r);}
}
console.log(JSON.stringify(__out));`;
}

function wrapClassPython(code, testCase) {
  const { operations, values } = testCase.input;
  if (!operations || !values) return code;
  const cls = operations[0];
  return `import json
${code}
__ops=${JSON.stringify(operations)}
__vals=${JSON.stringify(values)}
__out=[]
__o=None
for i in range(len(__ops)):
    if i==0:
        __o=${cls}(*__vals[i])
        __out.append(None)
    else:
        r=getattr(__o,__ops[i])(*__vals[i])
        __out.append(r)
print(json.dumps(__out))`;
}
