import { useState, useEffect, useRef } from "react";

export function useTimer(onTimerSync, interviewStatus) {
  const [timerEndsAt, setTimerEndsAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  const elapsedRef = useRef(null);

  // Sync timer from socket - with null check
  const setTimerEndsAtRef = useRef(setTimerEndsAt);
  setTimerEndsAtRef.current = setTimerEndsAt;
  useEffect(() => {
    if (onTimerSync) {
      onTimerSync(({ endsAt }) => setTimerEndsAtRef.current(endsAt));
    }
  }, [onTimerSync]);

  // Countdown tick
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerEndsAt) { 
      setSecondsLeft(null); 
      return; 
    }
    function tick() {
      const diff = Math.max(0, Math.round((new Date(timerEndsAt) - Date.now()) / 1000));
      setSecondsLeft(diff);
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerEndsAt]);

  // Elapsed count-up
  useEffect(() => {
    clearInterval(elapsedRef.current);
    if (interviewStatus === "in_progress") {
      elapsedRef.current = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    }
    return () => clearInterval(elapsedRef.current);
  }, [interviewStatus]);

  const formatCountdown = (s) => {
    if (s === null) return null;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return {
    timerEndsAt,
    secondsLeft,
    elapsedSeconds,
    formatCountdown,
    formatElapsed,
  };
}