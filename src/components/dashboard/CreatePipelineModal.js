"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";

const inputCls =
  "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all text-sm";

export default function CreatePipelineModal({ onClose, onCreated }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", targetHires: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key, val) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Pipeline name is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetHires: Number(form.targetHires) || 1 }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) { setError(data.error || "Failed to create pipeline"); return; }
      toast.success("Pipeline created!");
      onCreated(data.pipeline);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0a0818] border border-violet-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-violet-500/10">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-black text-white">New Pipeline</h2>
            <p className="text-slate-500 text-sm mt-1">Group interviews for a single role</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pipeline Name</label>
            <input
              type="text"
              placeholder="Senior Frontend Engineer — Q3"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="React + system design, 3 rounds"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Hires</label>
            <input
              type="number"
              min="1"
              max="50"
              value={form.targetHires}
              onChange={(e) => set("targetHires", e.target.value)}
              className={inputCls}
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-white/[0.08] text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            >
              {loading ? "Creating…" : "Create Pipeline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
