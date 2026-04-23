import { exec } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { platform } from "os";
import { dockerBreaker, CircuitBreakerOpenError } from "./circuitBreaker";
import { LANGUAGES } from "@/constants/languages";

const IS_WINDOWS = platform() === "win32";

// Build a lookup map from the shared language constants
const LANGUAGE_CONFIG = Object.fromEntries(
  Object.values(LANGUAGES).map((lang) => [
    lang.id,
    { ext: lang.ext, image: lang.dockerImage, cmd: lang.dockerCmd },
  ])
);

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
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { stdout: "", stderr: `Unsupported language: ${language}`, error: "Unsupported language" };
  }

  try {
    return await dockerBreaker.execute(() => _runContainer(code, config, stdin));
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      return {
        stdout: "",
        stderr: "Execution sandbox temporarily unavailable. Try again shortly.",
        error: "DOCKER_UNAVAILABLE",
      };
    }
    return { stdout: "", stderr: err.message, error: "DOCKER_UNAVAILABLE" };
  }
}

function _runContainer(code, config, stdin) {
  return new Promise((resolve, reject) => {
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
      "--no-new-privileges",
      "--cap-drop ALL",
      "--pids-limit 64",
      "--user 65534:65534",
      "--stop-timeout 2",
      `--name codroom_${id}`,
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
      exec(`docker rm -f codroom_${id}`, () => {});

      if (error?.killed || error?.code === "ETIMEDOUT") {
        return resolve({ stdout: "", stderr: "Time Limit Exceeded (10s)", error: "TLE" });
      }

      if (stderr?.includes("Cannot connect") || stderr?.includes("docker: not found") ||
          (error?.message?.includes("docker") && error?.message?.includes("pipe"))) {
        return reject(new Error("DOCKER_UNAVAILABLE"));
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
