"use client";

import { useEffect, useCallback, useRef } from "react";

export function useKeyboardShortcuts(shortcuts) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handler = useCallback((e) => {
    const target = e.target;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;

    const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

    for (const shortcut of shortcutsRef.current) {
      if (isInput && !shortcut.allowInInput) continue;

      const modKey = isMac ? e.metaKey : e.ctrlKey;
      const modMatch = shortcut.mod === undefined ? true : shortcut.mod === modKey;
      const shiftMatch = shortcut.shift === undefined ? !e.shiftKey : shortcut.shift === e.shiftKey;
      const altMatch = shortcut.alt === undefined ? !e.altKey : shortcut.alt === e.altKey;
      const keyMatch = e.key && shortcut.key && e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (modMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        e.stopPropagation();
        shortcut.handler(e);
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}

export function formatShortcut(shortcut) {
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const parts = [];
  if (shortcut.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (shortcut.shift) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(isMac ? "" : "+");
}
