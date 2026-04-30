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
        // Don't auto re-enter fullscreen - let interviewer decide
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
      
      if (e.ctrlKey && e.key === "a") {
        lastSelectAllRef.current = Date.now();
      }

      if (e.ctrlKey && e.key === "c") {
        const selection = window.getSelection()?.toString() || "";
        // Only flag if copying substantial content (> 50 chars)
        if (selection.length > 50) {
          const isCombo = Date.now() - lastSelectAllRef.current < 2000;
          addViolation(
            "copy_detected",
            isCombo
              ? `Select-all + copy (${selection.length} chars)`
              : `Copied ${selection.length} characters`
          );
        }
      }
    }

    function handleContextMenu(e) {
      // Monaco has its own context menu — don't flag it
      const isMonaco = e.target.closest(".monaco-editor");
      if (!isMonaco) {
        addViolation("right_click", "Candidate used right-click context menu");
      }
    }

    // Block dynamically injected external scripts (head only)
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
    scriptObserver.observe(document.head, { childList: true });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      scriptObserver.disconnect();
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [isActive, addViolation]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      // Fullscreen API requires user gesture - this is expected to fail sometimes
      console.warn("Fullscreen request failed:", err.message);
      // Don't throw error as this is normal browser behavior
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
