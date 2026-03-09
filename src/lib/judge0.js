import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export async function submitCode(code, language, stdin = "") {
  return new Promise((resolve) => {
    const tmpFile = join(tmpdir(), `codroom_${Date.now()}.js`);
    writeFileSync(tmpFile, code);

    exec(`node "${tmpFile}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      try { unlinkSync(tmpFile); } catch {}
      resolve({ stdout, stderr, error: error?.message });
    });
  });
}

export function parseResult(result) {
  if (result.stderr) {
    return { status: "error", output: result.stderr, type: "Runtime Error" };
  }
  if (result.error) {
    return { status: "error", output: result.error, type: "Error" };
  }
  return {
    status: "success",
    output: result.stdout || "(No output)",
    type: "Accepted",
  };
}