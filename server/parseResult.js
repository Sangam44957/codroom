const MAX_OUTPUT_SIZE = 5000;

export function truncateOutput(output) {
  if (!output || typeof output !== "string") return "";
  if (output.length <= MAX_OUTPUT_SIZE) return output;
  return output.slice(0, MAX_OUTPUT_SIZE) + "\n\n[Output truncated - exceeded 5000 characters]";
}

export function parseResult(result) {
  if (result.error === "DOCKER_UNAVAILABLE") {
    return { status: "error", output: result.stderr, type: "Sandbox Error" };
  }
  if (result.error === "TLE") {
    return { status: "error", output: "Time Limit Exceeded (15s)", type: "TLE" };
  }
  if (result.stderr?.trim()) {
    return { status: "error", output: truncateOutput(result.stderr.trim()), type: "Runtime Error" };
  }
  if (result.error) {
    const msg = result.error.replace(/Command failed:.*\n?/, "").trim();
    if (msg) return { status: "error", output: truncateOutput(msg), type: "Error" };
  }
  return {
    status: "success",
    output: truncateOutput(result.stdout?.trim() || "(No output)"),
    type: "Accepted",
  };
}
