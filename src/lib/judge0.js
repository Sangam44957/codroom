import { exec } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { platform } from "os";

const IS_WINDOWS = platform() === "win32";

// Language → { ext, image, cmd(filename) }
// cmd receives only the basename; the file is mounted read-only at /sandbox/<file>.
// Build artifacts for compiled languages go to /tmp (the tmpfs mount), never /sandbox.
const LANGUAGE_CONFIG = {
  javascript: { ext: "js",   image: "node:20-alpine",        cmd: (f) => `node /sandbox/${f}` },
  // Use a dedicated image with tsx pre-installed so no network fetch is needed
  // at runtime. Build once: docker build -t codroom-ts -f Dockerfile.sandbox-ts .
  typescript: { ext: "ts",   image: "codroom-ts",            cmd: (f) => `tsx /sandbox/${f}` },
  python:     { ext: "py",   image: "python:3.12-alpine",    cmd: (f) => `python /sandbox/${f}` },
  // javac writes .class files to /tmp; java -cp /tmp runs them from there
  java:       { ext: "java", image: "openjdk:21-slim",       cmd: (f) => `sh -c "javac -d /tmp /sandbox/${f} && java -cp /tmp Main"` },
  cpp:        { ext: "cpp",  image: "gcc:13",                cmd: (f) => `sh -c "g++ -o /tmp/out /sandbox/${f} && /tmp/out"` },
  c:          { ext: "c",    image: "gcc:13",                cmd: (f) => `sh -c "gcc -o /tmp/out /sandbox/${f} && /tmp/out"` },
  go:         { ext: "go",   image: "golang:1.22-alpine",    cmd: (f) => `go run /sandbox/${f}` },
  rust:       { ext: "rs",   image: "rust:1.77-alpine",      cmd: (f) => `sh -c "rustc -o /tmp/out /sandbox/${f} && /tmp/out"` },
};

const CODROOM_TMP = IS_WINDOWS
  ? join(process.env.TEMP || process.env.TMP || "C:\\Users\\Public\\Temp", "codroom")
  : "/tmp/codroom";

// Docker on Windows requires forward-slash volume paths (e.g. C:/Users/...)
function toDockerPath(winPath) {
  if (!IS_WINDOWS) return winPath;
  return winPath.replace(/\\/g, "/");
}

try { mkdirSync(CODROOM_TMP, { recursive: true }); } catch {}

export async function submitCode(code, language, stdin = "") {
  return new Promise((resolve) => {
    const config = LANGUAGE_CONFIG[language];
    if (!config) {
      return resolve({ stdout: "", stderr: `Unsupported language: ${language}`, error: "Unsupported language" });
    }

    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const filename = `codroom_${id}.${config.ext}`;
    const tmpFile = join(CODROOM_TMP, filename);

    try {
      writeFileSync(tmpFile, code, { encoding: "utf8" });
    } catch (err) {
      return resolve({ stdout: "", stderr: "", error: "Failed to write temp file: " + err.message });
    }

    // Mount the single file read-only; no network; capped memory + CPU
    const dockerCmd = [
      "docker run --rm",
      "--network none",
      "--memory 128m --memory-swap 128m",
      "--cpus 0.5",
      "--read-only",
      "--tmpfs /tmp:size=32m",
      `--volume "${toDockerPath(tmpFile)}:/sandbox/${filename}:ro"`,
      `--workdir /sandbox`,
      `--ulimit nproc=64`,
      config.image,
      config.cmd(filename),
    ].join(" ");

    const opts = {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      shell: IS_WINDOWS ? "cmd.exe" : "/bin/sh",
    };

    exec(dockerCmd, opts, (error, stdout, stderr) => {
      cleanup(tmpFile);

      if (error?.killed || error?.code === "ETIMEDOUT") {
        return resolve({ stdout: "", stderr: "Time Limit Exceeded (10s)", error: "TLE" });
      }

      // Docker not running / not installed
      if (stderr?.includes("Cannot connect") || stderr?.includes("docker: not found") ||
          error?.message?.includes("docker") && error?.message?.includes("pipe")) {
        return resolve({
          stdout: "",
          stderr: "Execution sandbox unavailable. Docker must be running on the server.",
          error: "DOCKER_UNAVAILABLE",
        });
      }

      resolve({ stdout, stderr, error: error?.message });
    });
  });
}

function cleanup(tmpFile) {
  try { unlinkSync(tmpFile); } catch {}
}

export function parseResult(result) {
  if (result.error === "DOCKER_UNAVAILABLE") {
    return { status: "error", output: result.stderr, type: "Sandbox Error" };
  }
  if (result.stderr?.trim()) {
    return { status: "error", output: result.stderr.trim(), type: "Runtime Error" };
  }
  if (result.error && result.error !== "TLE") {
    const msg = result.error.replace(/Command failed:.*\n?/, "").trim();
    if (msg) return { status: "error", output: msg, type: "Error" };
  }
  if (result.error === "TLE") {
    return { status: "error", output: "Time Limit Exceeded (10s)", type: "TLE" };
  }
  return {
    status: "success",
    output: result.stdout?.trim() || "(No output)",
    type: "Accepted",
  };
}
