"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const CHECK_DEFS = [
  { id: "camera",      label: "Camera",           desc: "Required for video interview" },
  { id: "microphone",  label: "Microphone",        desc: "Required for audio communication" },
  { id: "browser",     label: "Browser Support",   desc: "Modern browser with WebRTC support" },
  { id: "connection",  label: "Network",           desc: "Stable internet connection" },
  { id: "fullscreen",  label: "Fullscreen API",    desc: "Required for focus mode" },
];

async function runChecks(setResults) {
  // Browser check
  const hasWebRTC = !!(window.RTCPeerConnection && navigator.mediaDevices);
  setResults((p) => ({ ...p, browser: hasWebRTC ? "pass" : "fail" }));

  // Fullscreen check
  const hasFullscreen = !!(
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  );
  setResults((p) => ({ ...p, fullscreen: hasFullscreen ? "pass" : "warn" }));

  // Network check — simple latency ping
  try {
    const t0 = Date.now();
    await fetch("/api/health", { method: "HEAD", cache: "no-store" }).catch(() =>
      fetch("/", { method: "HEAD", cache: "no-store" })
    );
    const latency = Date.now() - t0;
    setResults((p) => ({
      ...p,
      connection: latency < 800 ? "pass" : latency < 2000 ? "warn" : "fail",
    }));
  } catch {
    setResults((p) => ({ ...p, connection: "fail" }));
  }

  // Camera + Microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((t) => t.stop());
    setResults((p) => ({ ...p, camera: "pass", microphone: "pass" }));
  } catch (err) {
    const msg = err.name;
    if (msg === "NotFoundError") {
      setResults((p) => ({ ...p, camera: "fail", microphone: "fail" }));
    } else if (msg === "NotAllowedError") {
      setResults((p) => ({ ...p, camera: "warn", microphone: "warn" }));
    } else {
      // Try audio only
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        setResults((p) => ({ ...p, camera: "fail", microphone: "pass" }));
      } catch {
        setResults((p) => ({ ...p, camera: "fail", microphone: "fail" }));
      }
    }
  }
}

const STATUS_ICON = {
  pending: <Loader size={14} className="text-slate-500 animate-spin" />,
  pass:    <CheckCircle size={14} className="text-emerald-400" />,
  warn:    <AlertCircle size={14} className="text-amber-400" />,
  fail:    <XCircle size={14} className="text-rose-400" />,
};

const STATUS_LABEL = { pending: "Checking…", pass: "OK", warn: "Warning", fail: "Failed" };

export default function SystemCheck({ onDismiss }) {
  const [results, setResults] = useState(() =>
    Object.fromEntries(CHECK_DEFS.map((c) => [c.id, "pending"]))
  );
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResults(Object.fromEntries(CHECK_DEFS.map((c) => [c.id, "pending"])));
    await runChecks(setResults);
    setRunning(false);
  }, []);

  useEffect(() => { run(); }, [run]);

  const values = Object.values(results);
  const allDone = values.every((v) => v !== "pending");
  const hasFail = values.some((v) => v === "fail");
  const hasWarn = values.some((v) => v === "warn");

  const overallStatus = !allDone ? "pending" : hasFail ? "fail" : hasWarn ? "warn" : "pass";

  const summaryColor = {
    pending: "border-white/[0.08] text-slate-400",
    pass:    "border-emerald-500/30 text-emerald-400",
    warn:    "border-amber-500/30 text-amber-400",
    fail:    "border-rose-500/30 text-rose-400",
  }[overallStatus];

  const summaryBg = {
    pending: "bg-white/[0.03]",
    pass:    "bg-emerald-500/5",
    warn:    "bg-amber-500/5",
    fail:    "bg-rose-500/5",
  }[overallStatus];

  return (
    <div className={`rounded-xl border ${summaryColor} ${summaryBg} overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {STATUS_ICON[overallStatus]}
          <span className="text-sm font-semibold">
            {!allDone
              ? "Checking your setup…"
              : overallStatus === "pass"
              ? "System ready"
              : overallStatus === "warn"
              ? "Setup has warnings"
              : "Setup issues detected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <button
              onClick={(e) => { e.stopPropagation(); run(); }}
              className="p-1 text-slate-500 hover:text-white transition-colors"
              title="Re-run checks"
            >
              <RefreshCw size={12} className={running ? "animate-spin" : ""} />
            </button>
          )}
          {expanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
        </div>
      </button>

      {/* Detail rows */}
      {expanded && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
          {CHECK_DEFS.map((check) => {
            const status = results[check.id];
            return (
              <div key={check.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-medium text-slate-300">{check.label}</p>
                  <p className="text-[10px] text-slate-600">{check.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON[status]}
                  <span className={`text-xs font-medium ${
                    status === "pass" ? "text-emerald-400"
                    : status === "warn" ? "text-amber-400"
                    : status === "fail" ? "text-rose-400"
                    : "text-slate-500"
                  }`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </div>
            );
          })}

          {allDone && hasFail && (
            <div className="px-4 py-3 bg-rose-500/5">
              <p className="text-xs text-rose-300">
                Some checks failed. Camera/mic permissions may be blocked — check your browser settings.
              </p>
            </div>
          )}
          {allDone && !hasFail && hasWarn && (
            <div className="px-4 py-3 bg-amber-500/5">
              <p className="text-xs text-amber-300">
                Warnings detected. The interview can proceed but some features may be limited.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
