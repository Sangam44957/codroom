"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  const styles = {
    success: { bg: "bg-emerald-500/10 border-emerald-500/20", icon: "✅", text: "text-emerald-300" },
    error:   { bg: "bg-rose-500/10 border-rose-500/20",       icon: "❌", text: "text-rose-300" },
    warning: { bg: "bg-amber-500/10 border-amber-500/20",     icon: "⚠️", text: "text-amber-300" },
    info:    { bg: "bg-violet-500/10 border-violet-500/20",   icon: "💡", text: "text-violet-300" },
  };
  const s = styles[toast.type] || styles.info;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${s.bg} ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      <span>{s.icon}</span>
      <p className={`text-sm font-medium ${s.text}`}>{toast.message}</p>
      <button onClick={onClose} className="text-slate-600 hover:text-white ml-2 text-xs transition-colors">✕</button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
