"use client";

import { useEffect, useRef, useCallback } from "react";

const AUTOSAVE_KEY = (roomId) => `codroom:autosave:${roomId}`;
const AUTOSAVE_INTERVAL = 30_000;

export function useNavigationGuard(isActive) {
  useEffect(() => {
    if (!isActive) return;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isActive]);
}

export function useAutoSave(roomId, code, isActive) {
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);

  useEffect(() => {
    if (!isActive || !roomId) return;
    const id = setInterval(() => {
      if (codeRef.current?.trim()) {
        localStorage.setItem(AUTOSAVE_KEY(roomId), JSON.stringify({
          code: codeRef.current,
          savedAt: new Date().toISOString(),
        }));
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(id);
  }, [roomId, isActive]);
}

export function getAutoSave(roomId) {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY(roomId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearAutoSave(roomId) {
  localStorage.removeItem(AUTOSAVE_KEY(roomId));
}
