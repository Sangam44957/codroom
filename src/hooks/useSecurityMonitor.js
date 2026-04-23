"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_LOCK_THRESHOLD = 10;

export default function useSecurityMonitor(isActive, onViolation, onLocked, lockThreshold = DEFAULT_LOCK_THRESHOLD) {
  const [violations, setViolations] = useState([]);
  const [warningCount, setWarningCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const onViolationRef = useRef(onViolation);
  const onLockedRef = useRef(onLocked);
  const violationCountRef = useRef(0);
  const blurTimerRef = useRef(null);
  const lastSelectAllRef = useRef(0);

  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onLockedRef.current = onLocked; }, [onLocked]);

  // Exposed so the interviewer can remotely unlock the candidate
  const unlock = useCallback(() => {
    setIsLocked(false);
    violationCountRef.current = 0;
    setViolations([]);
    setWarningCount(0);
  }, []);

  const addViolation = useCallback((type, details) => {
    if (!isActive) return;
    const violation = {
      id: Date.now().toString(),
      type,
      details,
      timestamp: new Date().toISOString(),
    };
    setViolations((prev) => [...prev, violation]);
    setWarningCount((prev) => prev + 1);
    onViolationRef.current?.(violation);

    violationCountRef.current += 1;
    if (violationCountRef.current >= lockThreshold) {
      setIsLocked(true);
      onLockedRef.current?.(violationCountRef.current);
    }
  }, [isActive, lockThreshold]);

  useEffect(() => {
    if (!isActive) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        addViolation("tab_switch", "Candidate switched to another tab");
      }
    }

    function handleBlur() {
      blurTimerRef.current = setTimeout(() => {
        if (!document.hasFocus() && !document.hidden) {
          addViolation("window_blur", "Candidate clicked outside the browser window");
        }
      }, 300);
    }

    function handleFocus() {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    }

    function handleFullscreenChange() {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && isActive) {
        addViolation("fullscreen_exit", "Candidate exited fullscreen mode");
        // Re-request fullscreen after a short delay so the violation is recorded
        // before the browser re-enters fullscreen (requires a user gesture context)
        setTimeout(() => {
          if (document.fullscreenElement) return; // already back
          document.documentElement.requestFullscreen().catch(() => {});
        }, 800);
      }
    }

    function handlePaste(e) {
      // Ignore paste events that originate inside the Monaco editor iframe/container
      const target = e.target;
      const isInEditor = target?.closest?.(".monaco-editor") ||
        target?.closest?.("[data-keybinding-context]") ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT";
      if (isInEditor) return;

      const pastedText = e.clipboardData?.getData("text") || "";
      if (pastedText.length > 20) {
        addViolation("paste_detected", `Candidate pasted ${pastedText.length} characters outside editor`);
      }
    }

    function handleKeyDown(e) {
      if (e.altKey && e.key === "Tab") {
        addViolation("alt_tab", "Candidate pressed Alt+Tab");
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) {
        addViolation("devtools", "Candidate tried to open DevTools");
        e.preventDefault();
      }
      if (e.key === "F12") {
        addViolation("devtools", "Candidate pressed F12");
        e.preventDefault();
      }
      // Track Ctrl+A for combo detection
      if (e.ctrlKey && e.key === "a") {
        lastSelectAllRef.current = Date.now();
      }
      // Only flag Ctrl+C as a violation when it's a select-all+copy combo
      // (Ctrl+A within 2s then Ctrl+C) — normal in-editor copy is fine
      if (e.ctrlKey && e.key === "c") {
        const isCombo = Date.now() - lastSelectAllRef.current < 2000;
        if (isCombo) {
          addViolation("copy_detected", "Candidate used Ctrl+A then Ctrl+C (select-all copy)");
        }
      }
    }

    // Block dynamically injected external scripts
    const scriptObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === "SCRIPT" && node.src && !node.src.startsWith(window.location.origin)) {
            node.remove();
            addViolation("external_script", `Blocked external script: ${node.src}`);
          }
        }
      }
    });
    scriptObserver.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
      scriptObserver.disconnect();
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [isActive, addViolation]);

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (err) {
      console.error("Exit fullscreen failed:", err);
    }
  }, []);

  return { violations, warningCount, isFullscreen, isLocked, unlock, requestFullscreen, exitFullscreen };
}
