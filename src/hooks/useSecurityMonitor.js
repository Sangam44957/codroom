"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function useSecurityMonitor(isActive, onViolation) {
  const [violations, setViolations] = useState([]);
  const [warningCount, setWarningCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const onViolationRef = useRef(onViolation);
  // Debounce blur — Monaco iframe focus transfers cause false positives
  const blurTimerRef = useRef(null);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const addViolation = useCallback((type, details) => {
    const violation = {
      id: Date.now().toString(),
      type,
      details,
      timestamp: new Date().toISOString(),
    };
    setViolations((prev) => [...prev, violation]);
    setWarningCount((prev) => prev + 1);
    onViolationRef.current?.(violation);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        addViolation("tab_switch", "Candidate switched to another tab");
      }
    }

    // Debounced blur: wait 300ms — if focus came back (e.g. Monaco iframe)
    // the refocus fires before the timer and we cancel it
    function handleBlur() {
      blurTimerRef.current = setTimeout(() => {
        // Only fire if document is still not focused and not hidden
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
      }
    }

    function handlePaste(e) {
      const pastedText = e.clipboardData?.getData("text") || "";
      if (pastedText.length > 20) {
        addViolation("paste_detected", `Candidate pasted ${pastedText.length} characters`);
      }
    }

    function handleContextMenu() {
      addViolation("right_click", "Candidate used right-click context menu");
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
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
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

  return { violations, warningCount, isFullscreen, requestFullscreen, exitFullscreen };
}
