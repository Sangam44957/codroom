"use client";

import { useEffect, useRef, useState } from "react";
import { useKeyboardShortcuts, formatShortcut } from "@/hooks/useKeyboardShortcuts";

const ROOM_SHORTCUTS = [
  { id: "run-code",          key: "Enter", mod: true, shift: true, description: "Run code",              allowInInput: true },
  { id: "run-tests",         key: "t",     mod: true, shift: true, description: "Run tests" },
  { id: "toggle-chat",       key: "k",     mod: true, shift: true, description: "Toggle chat panel" },
  { id: "toggle-whiteboard", key: "b",     mod: true, shift: true, description: "Toggle whiteboard" },
  { id: "focus-editor",      key: "e",     mod: true, shift: true, description: "Focus code editor" },
  { id: "show-shortcuts",    key: "/",     mod: true,              description: "Show keyboard shortcuts" },
  { id: "reset-layout",      key: "0",     mod: true,              description: "Reset panel layout" },
];

export function useRoomShortcuts({ onRunCode, onRunTests, onToggleChat, onToggleWhiteboard, onFocusEditor, onResetLayout }) {
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  const shortcuts = ROOM_SHORTCUTS.map((s) => ({
    ...s,
    handler: () => {
      switch (s.id) {
        case "run-code":          onRunCode?.(); break;
        case "run-tests":         onRunTests?.(); break;
        case "toggle-chat":       onToggleChat?.(); break;
        case "toggle-whiteboard": onToggleWhiteboard?.(); break;
        case "focus-editor":      onFocusEditor?.(); break;
        case "show-shortcuts":    setShowShortcutModal((v) => !v); break;
        case "reset-layout":      onResetLayout?.(); break;
      }
    },
  }));

  useKeyboardShortcuts(shortcuts);

  return { showShortcutModal, setShowShortcutModal };
}

export function ShortcutHelpModal({ open, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-[#111118] border border-white/[0.08] rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Keyboard Shortcuts</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close shortcuts dialog"
          >
            ×
          </button>
        </div>
        <div className="space-y-1">
          {ROOM_SHORTCUTS.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-slate-400">{s.description}</span>
              <kbd className="px-2 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-xs font-mono text-slate-300">
                {formatShortcut(s)}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-600 text-center">
          Press <kbd className="font-mono">Ctrl+/</kbd> to toggle
        </p>
      </div>
    </div>
  );
}
