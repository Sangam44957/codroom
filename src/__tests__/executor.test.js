/**
 * executor.test.js
 *
 * Part 1 — parseResult() unit tests (no Docker, no spawn).
 * Part 2 — Docker smoke tests (skipped unless RUN_DOCKER_TESTS=1).
 */

import { parseResult } from "../../server/parseResult.js";

// ─── Part 1: parseResult() branches ──────────────────────────────────────────

describe("parseResult()", () => {
  test("DOCKER_UNAVAILABLE → Sandbox Error", () => {
    const r = parseResult({ error: "DOCKER_UNAVAILABLE", stderr: "daemon not running", stdout: "" });
    expect(r).toEqual({ status: "error", output: "daemon not running", type: "Sandbox Error" });
  });

  test("TLE → TLE", () => {
    const r = parseResult({ error: "TLE", stderr: "Time Limit Exceeded (15s)", stdout: "" });
    expect(r).toEqual({ status: "error", output: "Time Limit Exceeded (15s)", type: "TLE" });
  });

  test("non-empty stderr → Runtime Error", () => {
    const r = parseResult({ error: null, stderr: "NameError: name 'x' is not defined", stdout: "" });
    expect(r.status).toBe("error");
    expect(r.type).toBe("Runtime Error");
    expect(r.output).toContain("NameError");
  });

  test("non-zero exit, no stderr → generic Error", () => {
    const r = parseResult({ error: "Process exited with code 1", stderr: "", stdout: "" });
    expect(r.status).toBe("error");
    expect(r.type).toBe("Error");
  });

  test("success with output", () => {
    const r = parseResult({ error: null, stderr: "", stdout: "Hello\n" });
    expect(r).toEqual({ status: "success", output: "Hello", type: "Accepted" });
  });

  test("success with no output → (No output)", () => {
    const r = parseResult({ error: null, stderr: "", stdout: "" });
    expect(r).toEqual({ status: "success", output: "(No output)", type: "Accepted" });
  });

  test("stdout over 5000 chars is truncated", () => {
    const r = parseResult({ error: null, stderr: "", stdout: "x".repeat(6000) });
    expect(r.status).toBe("success");
    expect(r.output).toContain("[Output truncated");
    expect(r.output.length).toBeLessThan(6000);
  });
});

// ─── Part 2: Docker smoke tests ───────────────────────────────────────────────

const RUN_DOCKER = process.env.RUN_DOCKER_TESTS === "1";

const SMOKE_CASES = [
  ["javascript", `console.log("ok")`],
  ["typescript", `console.log("ok")`],
  ["python",     `print("ok")`],
  ["java",       `public class Solution { public static void main(String[] a) { System.out.println("ok"); } }`],
  ["cpp",        `#include<iostream>\nint main(){std::cout<<"ok"<<std::endl;return 0;}`],
  ["c",          `#include<stdio.h>\nint main(){printf("ok\\n");return 0;}`],
  ["go",         `package main\nimport "fmt"\nfunc main(){fmt.Println("ok")}`],
  ["rust",       `fn main(){println!("ok");}`],
];

describe.each(SMOKE_CASES)("Docker smoke — %s", (language, code) => {
  test(
    `runs trivial ${language} code and returns success`,
    async () => {
      if (!RUN_DOCKER) return;

      const { submitCode } = await import("../../server/executor.mjs");
      const result = await submitCode(code, language);
      const parsed = parseResult(result);

      expect(parsed.status).toBe("success");
      expect(parsed.output).toContain("ok");
    },
    30_000
  );
});
