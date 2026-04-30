import { spawn } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join, normalize, resolve } from "path";
import { platform } from "os";
import { dockerBreaker, CircuitBreakerOpenError } from "./circuitBreaker";
import { LANGUAGES } from "@/constants/languages";

const IS_WINDOWS = platform() === "win32";
const MAX_OUTPUT_SIZE = 5000;
const MAX_CONCURRENT_CONTAINERS = 5;

// Container concurrency control
let runningContainers = 0;
const containerQueue = [];

// Docker version detection cache
let dockerVersion = null;
let dockerCapabilities = null;

// Detect Docker version and capabilities
async function detectDockerCapabilities() {
  if (dockerCapabilities !== null) return dockerCapabilities;
  
  return new Promise((resolve) => {
    const versionProcess = spawn("docker", ["version", "--format", "{{.Server.Version}}"], {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000
    });
    
    let version = "";
    versionProcess.stdout?.on("data", (data) => {
      version += data.toString().trim();
    });
    
    versionProcess.on("close", () => {
      dockerVersion = version;
      
      // Parse version and determine capabilities
      const versionParts = version.split('.').map(Number);
      const major = versionParts[0] || 0;
      const minor = versionParts[1] || 0;
      
      dockerCapabilities = {
        supportsNoNewPrivileges: major > 1 || (major === 1 && minor >= 11),
        supportsPidsLimit: major > 1 || (major === 1 && minor >= 10),
        supportsStopTimeout: major > 1 || (major === 1 && minor >= 25),
        supportsMemorySwap: major > 1 || (major === 1 && minor >= 6),
        supportsUlimit: major > 1 || (major === 1 && minor >= 6)
      };
      
      console.log(`[Docker] Version ${version} detected, capabilities:`, dockerCapabilities);
      resolve(dockerCapabilities);
    });
    
    versionProcess.on("error", () => {
      // Fallback to minimal capabilities for unknown Docker versions
      dockerCapabilities = {
        supportsNoNewPrivileges: false,
        supportsPidsLimit: false,
        supportsStopTimeout: false,
        supportsMemorySwap: false,
        supportsUlimit: false
      };
      console.log("[Docker] Version detection failed, using minimal capabilities");
      resolve(dockerCapabilities);
    });
  });
}

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

// Truncate output to prevent browser crashes from infinite loops
function truncateOutput(output) {
  if (!output || typeof output !== "string") return "";
  if (output.length <= MAX_OUTPUT_SIZE) return output;
  return output.slice(0, MAX_OUTPUT_SIZE) + "\n\n[Output truncated - exceeded 5000 characters]";
}

// Secure path validation to prevent directory traversal
function validatePath(filePath, baseDir) {
  const normalizedPath = normalize(filePath);
  const resolvedPath = resolve(baseDir, normalizedPath);
  const resolvedBase = resolve(baseDir);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error("Path traversal attempt detected");
  }
  
  return resolvedPath;
}

try { mkdirSync(CODROOM_TMP, { recursive: true }); } catch {}

export async function submitCode(code, language, stdin = "") {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { stdout: "", stderr: `Unsupported language: ${language}`, error: "Unsupported language" };
  }

  // Check concurrency limit
  if (runningContainers >= MAX_CONCURRENT_CONTAINERS) {
    return new Promise((resolve) => {
      containerQueue.push(() => submitCode(code, language, stdin).then(resolve));
    });
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

async function _runContainer(code, config, stdin) {
  // Detect Docker capabilities first
  const capabilities = await detectDockerCapabilities();
  
  runningContainers++;
  
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const filename = `codroom_${id}.${config.ext}`;
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
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

    // Build Docker arguments with version-specific capabilities
    const dockerArgs = [
      "run", "--rm",
      "--network", "none",
      "--memory", "128m",
      "--cpus", "0.5",
      "--read-only",
      "--tmpfs", "/tmp:size=32m",
      "--cap-drop", "ALL",
      "--user", "65534:65534",
      "--name", `codroom_${id}`,
      "--volume", `${toDockerPath(tmpFile)}:/sandbox/${filename}:ro`,
      "--workdir", "/sandbox"
    ];
    
    // Add version-specific security flags
    if (capabilities.supportsMemorySwap) {
      dockerArgs.push("--memory-swap", "128m");
    }
    
    if (capabilities.supportsNoNewPrivileges) {
      dockerArgs.push("--no-new-privileges");
    }
    
    if (capabilities.supportsPidsLimit) {
      dockerArgs.push("--pids-limit", "50");
    }
    
    if (capabilities.supportsStopTimeout) {
      dockerArgs.push("--stop-timeout", "2");
    }
    
    if (capabilities.supportsUlimit) {
      dockerArgs.push("--ulimit", "nproc=50", "--ulimit", "cpu=5");
    }
    
    // Add the Docker image
    dockerArgs.push(config.image);

    // Add command arguments safely
    const cmdArgs = config.cmd(filename);
    dockerArgs.push(...cmdArgs);

    const dockerProcess = spawn("docker", dockerArgs, {
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let killed = false;
    let retryWithMinimalFlags = false;

    const timeout = setTimeout(() => {
      killed = true;
      dockerProcess.kill("SIGKILL");
      // Await cleanup to prevent container pile-up
      cleanupContainer(id, tmpFile).then(() => {
        runningContainers--;
        processQueue();
      });
    }, 15000);

    dockerProcess.stdout?.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT_SIZE * 2) {
        killed = true;
        dockerProcess.kill("SIGKILL");
      }
    });

    dockerProcess.stderr?.on("data", (data) => {
      const errorText = data.toString();
      stderr += errorText;
      
      // Check for unsupported flag errors
      if (errorText.includes("unknown flag") || errorText.includes("unknown option")) {
        retryWithMinimalFlags = true;
        dockerProcess.kill("SIGTERM");
      }
      
      if (stderr.length > MAX_OUTPUT_SIZE * 2) {
        killed = true;
        dockerProcess.kill("SIGKILL");
      }
    });

    dockerProcess.on("close", async (code, signal) => {
      clearTimeout(timeout);
      
      // If we detected unsupported flags, retry with minimal configuration
      if (retryWithMinimalFlags && !killed) {
        console.log("[Docker] Retrying with minimal flags due to unsupported options");
        
        // Update capabilities to disable unsupported features
        dockerCapabilities = {
          supportsNoNewPrivileges: false,
          supportsPidsLimit: false,
          supportsStopTimeout: false,
          supportsMemorySwap: false,
          supportsUlimit: false
        };
        
        // Cleanup and retry
        await cleanupContainer(id, tmpFile);
        runningContainers--;
        
        // Recursive call with updated capabilities
        return _runContainer(code, config, stdin).then(resolve).catch(reject);
      }
      
      await cleanupContainer(id, tmpFile);
      runningContainers--;
      processQueue();

      if (killed || signal === "SIGKILL") {
        return resolve({ 
          stdout: "", 
          stderr: "Time Limit Exceeded (15s)", 
          error: "TLE" 
        });
      }

      if (stderr?.includes("Cannot connect") || stderr?.includes("docker: not found")) {
        return reject(new Error("DOCKER_UNAVAILABLE"));
      }

      resolve({ 
        stdout: truncateOutput(stdout), 
        stderr: truncateOutput(stderr), 
        error: code !== 0 ? `Process exited with code ${code}` : null 
      });
    });

    dockerProcess.on("error", async (err) => {
      clearTimeout(timeout);
      await cleanupContainer(id, tmpFile);
      runningContainers--;
      processQueue();
      if (err.message?.includes("docker")) {
        reject(new Error("DOCKER_UNAVAILABLE"));
      } else {
        reject(err);
      }
    });

    // Send stdin if provided
    if (stdin && dockerProcess.stdin) {
      dockerProcess.stdin.write(stdin);
      dockerProcess.stdin.end();
    }
  });
}

async function cleanupContainer(id, tmpFile) {
  // Clean up temp file
  try { unlinkSync(tmpFile); } catch {}
  
  // Await container removal to prevent pile-up
  return new Promise((resolve) => {
    const rmProcess = spawn("docker", ["rm", "-f", `codroom_${id}`], { stdio: "ignore" });
    rmProcess.on("close", () => resolve());
    rmProcess.on("error", () => resolve()); // Continue even if rm fails
    
    // Timeout the rm command after 5 seconds
    setTimeout(() => {
      rmProcess.kill("SIGKILL");
      resolve();
    }, 5000);
  });
}

function processQueue() {
  if (containerQueue.length > 0 && runningContainers < MAX_CONCURRENT_CONTAINERS) {
    const nextTask = containerQueue.shift();
    nextTask();
  }
}

function cleanup(tmpFile) {
  try { unlinkSync(tmpFile); } catch {}
}

export function parseResult(result) {
  if (result.error === "DOCKER_UNAVAILABLE") {
    return { status: "error", output: result.stderr, type: "Sandbox Error" };
  }
  if (result.stderr?.trim()) {
    return { status: "error", output: truncateOutput(result.stderr.trim()), type: "Runtime Error" };
  }
  if (result.error && result.error !== "TLE") {
    const msg = result.error.replace(/Command failed:.*\n?/, "").trim();
    if (msg) return { status: "error", output: truncateOutput(msg), type: "Error" };
  }
  if (result.error === "TLE") {
    return { status: "error", output: "Time Limit Exceeded (15s)", type: "TLE" };
  }
  return {
    status: "success",
    output: truncateOutput(result.stdout?.trim() || "(No output)"),
    type: "Accepted",
  };
}
