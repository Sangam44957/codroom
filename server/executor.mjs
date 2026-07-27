import { spawn } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join, normalize, resolve } from "path";
import { platform } from "os";
import { LANGUAGES } from "../src/constants/languages.js";
import { CircuitBreaker, CircuitBreakerOpenError } from "../src/lib/circuitBreaker.js";
import { logger } from "../src/lib/logger.js";
import { truncateOutput, parseResult } from "./parseResult.js";
export { parseResult } from "./parseResult.js";

const IS_WINDOWS = platform() === "win32";
const MAX_OUTPUT_SIZE = 5000;
const MAX_CONCURRENT_CONTAINERS = 5;

let runningContainers = 0;
const containerQueue = [];

let dockerCapabilities = null;

async function detectDockerCapabilities() {
  if (dockerCapabilities !== null) return dockerCapabilities;

  return new Promise((resolve) => {
    const proc = spawn("docker", ["version", "--format", "{{.Server.Version}}"], {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });

    let version = "";
    proc.stdout?.on("data", (d) => { version += d.toString().trim(); });

    proc.on("close", () => {
      const [major = 0, minor = 0] = version.split(".").map(Number);
      dockerCapabilities = {
        supportsNoNewPrivileges: major > 1 || (major === 1 && minor >= 11),
        supportsPidsLimit:       major > 1 || (major === 1 && minor >= 10),
        supportsStopTimeout:     major > 1 || (major === 1 && minor >= 25),
        supportsMemorySwap:      major > 1 || (major === 1 && minor >= 6),
        supportsUlimit:          major > 1 || (major === 1 && minor >= 6),
      };
      logger.info({ version, capabilities: dockerCapabilities }, "Docker version detected");
      resolve(dockerCapabilities);
    });

    proc.on("error", () => {
      dockerCapabilities = {
        supportsNoNewPrivileges: false,
        supportsPidsLimit: false,
        supportsStopTimeout: false,
        supportsMemorySwap: false,
        supportsUlimit: false,
      };
      logger.warn("Docker version detection failed, using minimal capabilities");
      resolve(dockerCapabilities);
    });
  });
}

const LANGUAGE_CONFIG = Object.fromEntries(
  Object.values(LANGUAGES).map((lang) => [
    lang.id,
    { ext: lang.ext, image: lang.dockerImage, cmd: lang.dockerCmd },
  ])
);

const CODROOM_TMP = IS_WINDOWS
  ? join(process.env.TEMP || process.env.TMP || "C:\\Users\\Public\\Temp", "codroom")
  : "/tmp/codroom";

function toDockerPath(p) {
  return IS_WINDOWS ? p.replace(/\\/g, "/") : p;
}

// truncateOutput and parseResult live in ./parseResult.js

function validatePath(filename, baseDir) {
  const resolved = resolve(baseDir, normalize(filename));
  if (!resolved.startsWith(resolve(baseDir))) throw new Error("Path traversal attempt detected");
  return resolved;
}

try { mkdirSync(CODROOM_TMP, { recursive: true }); } catch {}

export const dockerBreaker = new CircuitBreaker("code-execution", {
  failureThreshold: 10,
  resetTimeoutMs: 60_000,
});

export async function submitCode(code, language, stdin = "") {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { stdout: "", stderr: `Unsupported language: ${language}`, error: "Unsupported language" };
  }

  if (runningContainers >= MAX_CONCURRENT_CONTAINERS) {
    return new Promise((resolve) => {
      containerQueue.push(() => submitCode(code, language, stdin).then(resolve));
    });
  }

  try {
    return await dockerBreaker.execute(() => _runContainer(code, config, stdin));
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      return { stdout: "", stderr: "Execution sandbox temporarily unavailable. Try again shortly.", error: "DOCKER_UNAVAILABLE" };
    }
    return { stdout: "", stderr: err.message, error: "DOCKER_UNAVAILABLE" };
  }
}

async function _runContainer(code, config, stdin) {
  const capabilities = await detectDockerCapabilities();
  runningContainers++;

  return new Promise((resolve, reject) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const filename = `codroom_${id}.${config.ext}`;

    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      runningContainers--;
      processQueue();
      return resolve({ stdout: "", stderr: "Invalid filename", error: "Invalid filename" });
    }

    const tmpFile = validatePath(filename, CODROOM_TMP);

    try {
      writeFileSync(tmpFile, code, { encoding: "utf8" });
    } catch (err) {
      runningContainers--;
      processQueue();
      return resolve({ stdout: "", stderr: "", error: "Failed to write temp file: " + err.message });
    }

    const dockerArgs = [
      "run", "--rm",
      "--network", "none",
      "--memory", "128m",
      "--cpus", "0.5",
      "--read-only",
      "--tmpfs", "/tmp:size=32m",
      "--cap-drop", "ALL",
      "--name", `codroom_${id}`,
      "--volume", `${toDockerPath(tmpFile)}:/sandbox/${filename}:ro`,
      "--workdir", "/sandbox",
    ];

    if (capabilities.supportsMemorySwap)      dockerArgs.push("--memory-swap", "128m");
    if (capabilities.supportsNoNewPrivileges)  dockerArgs.push("--no-new-privileges");
    if (capabilities.supportsPidsLimit)        dockerArgs.push("--pids-limit", "50");
    if (capabilities.supportsStopTimeout)      dockerArgs.push("--stop-timeout", "2");
    if (capabilities.supportsUlimit)           dockerArgs.push("--ulimit", "nproc=50", "--ulimit", "cpu=5");

    dockerArgs.push(config.image, ...config.cmd(filename));

    const proc = spawn("docker", dockerArgs, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "", stderr = "", killed = false, retryWithMinimalFlags = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
      cleanupContainer(id, tmpFile).then(() => { runningContainers--; processQueue(); });
    }, 15000);

    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
      if (stdout.length > MAX_OUTPUT_SIZE * 2) { killed = true; proc.kill("SIGKILL"); }
    });

    proc.stderr?.on("data", (d) => {
      const text = d.toString();
      stderr += text;
      if (text.includes("unknown flag") || text.includes("unknown option")) {
        retryWithMinimalFlags = true;
        proc.kill("SIGTERM");
      }
      if (stderr.length > MAX_OUTPUT_SIZE * 2) { killed = true; proc.kill("SIGKILL"); }
    });

    proc.on("close", async (code, signal) => {
      clearTimeout(timer);

      if (retryWithMinimalFlags && !killed) {
        logger.info("Retrying Docker execution with minimal flags");
        dockerCapabilities = { supportsNoNewPrivileges: false, supportsPidsLimit: false, supportsStopTimeout: false, supportsMemorySwap: false, supportsUlimit: false };
        await cleanupContainer(id, tmpFile);
        runningContainers--;
        try { resolve(await _runContainer(code, config, stdin)); } catch (e) { reject(e); }
        return;
      }

      await cleanupContainer(id, tmpFile);
      runningContainers--;
      processQueue();

      if (killed || signal === "SIGKILL") {
        return resolve({ stdout: "", stderr: "Time Limit Exceeded (15s)", error: "TLE" });
      }
      if (stderr?.includes("Cannot connect") || stderr?.includes("docker: not found")) {
        return reject(new Error("DOCKER_UNAVAILABLE"));
      }

      resolve({
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        error: code !== 0 ? `Process exited with code ${code}` : null,
      });
    });

    proc.on("error", async (err) => {
      clearTimeout(timer);
      await cleanupContainer(id, tmpFile);
      runningContainers--;
      processQueue();
      err.message?.includes("docker") ? reject(new Error("DOCKER_UNAVAILABLE")) : reject(err);
    });

    if (stdin && proc.stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }
  });
}

async function cleanupContainer(id, tmpFile) {
  try { unlinkSync(tmpFile); } catch {}
  return new Promise((resolve) => {
    const rm = spawn("docker", ["rm", "-f", `codroom_${id}`], { stdio: "ignore" });
    rm.on("close", resolve);
    rm.on("error", resolve);
    setTimeout(() => { rm.kill("SIGKILL"); resolve(); }, 5000);
  });
}

function processQueue() {
  if (containerQueue.length > 0 && runningContainers < MAX_CONCURRENT_CONTAINERS) {
    containerQueue.shift()();
  }
}


