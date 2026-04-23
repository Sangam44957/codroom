"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { LANGUAGE_LIST } from "@/constants/languages";

const DIFF_CLS = {
  easy:   "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  hard:   "bg-rose-500/10 border-rose-500/20 text-rose-300",
};

const inputCls = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all text-sm";

export default function CreateTemplateModal({ onClose, onCreated }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", description: "", language: "javascript", durationMinutes: 60, focusModeEnabled: false,
  });
  const [problems, setProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingProblems(true);
    fetch("/api/problems")
      .then((r) => r.json())
      .then((d) => { if (d.problems) setProblems(d.problems); })
      .finally(() => setLoadingProblems(false));
  }, []);

  const selectedIds = new Set(selectedProblems.map((p) => p.id));
  const filtered = problems.filter((p) =>
    !selectedIds.has(p.id) &&
    (filter === "all" || p.difficulty === filter) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMinutes: Number(form.durationMinutes) || 60,
          problemIds: selectedProblems.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) { setError(data.error || "Failed to create template"); return; }
      toast.success("Template created!");
      onCreated(data.template);
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0a0818] border border-violet-500/20 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-violet-500/10">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-black text-white">Create Template</h2>
            <p className="text-slate-500 text-sm mt-1">Save a room preset for quick reuse</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 hover:text-white flex items-center justify-center transition-all">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
            <input type="text" placeholder="Senior Frontend Interview" value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description <span className="text-slate-600">(optional)</span></label>
            <input type="text" placeholder="React + algorithms, 60 min" value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
              <select value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))} className={inputCls}>
                {LANGUAGE_LIST.map((l) => <option key={l.id} value={l.id} className="bg-[#0a0818]">{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes)</label>
              <input type="number" min="15" max="240" value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} className={inputCls} />
            </div>
          </div>

          {/* Selected problems */}
          {selectedProblems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Selected Problems <span className="text-slate-500">({selectedProblems.length})</span>
              </label>
              <div className="space-y-1.5">
                {selectedProblems.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                    <span className="text-white text-sm truncate">{p.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${DIFF_CLS[p.difficulty] || ""}`}>{p.difficulty}</span>
                      <button type="button" onClick={() => setSelectedProblems((prev) => prev.filter((x) => x.id !== p.id))}
                        className="text-slate-600 hover:text-rose-400 transition-colors"><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problem picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Add Problems <span className="text-slate-600">(optional)</span>
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all" />
              {["all", "easy", "medium", "hard"].map((d) => (
                <button key={d} type="button" onClick={() => setFilter(d)}
                  className={`px-3 py-2 text-xs rounded-xl capitalize font-medium border transition-all ${
                    filter === d
                      ? d === "all" ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : DIFF_CLS[d]
                      : "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300"
                  }`}>{d}</button>
              ))}
            </div>
            <div className="max-h-44 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.01]">
              {loadingProblems ? (
                <div className="p-5 text-slate-500 text-sm text-center">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-5 text-slate-600 text-sm text-center">No more problems to add</div>
              ) : (
                filtered.slice(0, 20).map((p) => (
                  <div key={p.id} onClick={() => setSelectedProblems((prev) => [...prev, p])}
                    className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <span className="text-white text-sm font-medium truncate">{p.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-slate-600 text-xs capitalize hidden sm:inline">{p.topic}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg capitalize font-medium border ${DIFF_CLS[p.difficulty] || ""}`}>{p.difficulty}</span>
                      <Plus size={13} className="text-slate-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="focusMode" checked={form.focusModeEnabled}
              onChange={(e) => setForm((p) => ({ ...p, focusModeEnabled: e.target.checked }))}
              className="w-4 h-4 accent-violet-500" />
            <label htmlFor="focusMode" className="text-sm text-slate-300">
              Enable Focus Mode <span className="text-slate-600">(blocks tab switching for candidates)</span>
            </label>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-white/[0.08] text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40">
              {loading ? "Creating…" : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
