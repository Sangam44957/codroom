"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { X, Plus, GripVertical, LayoutTemplate, Clock, Zap } from "lucide-react";
import { LANGUAGE_LIST } from "@/constants/languages";

const DIFF_CLS = {
  easy:   "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  hard:   "bg-rose-500/10 border-rose-500/20 text-rose-300",
};

const TAB_CLS = (active) =>
  `flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
    active
      ? "bg-violet-600/20 border border-violet-500/40 text-violet-300"
      : "text-slate-500 hover:text-slate-300 border border-transparent"
  }`;

export default function CreateRoomModal({ isOpen, onClose }) {
  const router = useRouter();
  const [tab, setTab] = useState("manual"); // "manual" | "template"

  // ── Manual form state ──────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [problemSearch, setProblemSearch] = useState("");
  const [problemFilter, setProblemFilter] = useState("all");
  const [loadingProblems, setLoadingProblems] = useState(false);

  // ── Template form state ────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tplCandidateName, setTplCandidateName] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplPipelineId, setTplPipelineId] = useState(null);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState("");

  // ── Pipeline state ────────────────────────────────────────────────────────
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchProblems();
    fetchTemplates();
    fetchPipelines();
  }, [isOpen]);

  async function fetchProblems() {
    setLoadingProblems(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/problems", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok) setProblems(data.problems);
    } catch { } finally { setLoadingProblems(false); }
  }

  async function fetchPipelines() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/pipelines", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok) setPipelines(data.pipelines.filter((p) => p.status === "ACTIVE"));
    } catch { }
  }

  async function fetchTemplates() {
    setLoadingTemplates(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/templates", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok) setTemplates(data.templates);
    } catch { } finally { setLoadingTemplates(false); }
  }

  // ── Problem picker helpers ─────────────────────────────────────────────────
  const selectedIds = new Set(selectedProblems.map((p) => p.id));
  const filtered = problems.filter((p) =>
    !selectedIds.has(p.id) &&
    (problemFilter === "all" || p.difficulty === problemFilter) &&
    (!problemSearch || p.title.toLowerCase().includes(problemSearch.toLowerCase()))
  );

  function addProblem(p) { setSelectedProblems((prev) => [...prev, p]); }
  function removeProblem(id) { setSelectedProblems((prev) => prev.filter((p) => p.id !== id)); }
  function moveUp(idx) {
    if (idx === 0) return;
    setSelectedProblems((prev) => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; });
  }
  function moveDown(idx) {
    setSelectedProblems((prev) => {
      if (idx === prev.length - 1) return prev;
      const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n;
    });
  }

  // ── Manual submit ──────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Room title is required"); return; }
    setLoading(true); setError("");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          candidateName: candidateName.trim() || null,
          language,
          problemIds: selectedProblems.map((p) => p.id),
          pipelineId: pipelineId || null,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) { toast.error(data.error || "Failed to create room"); setError(data.error); return; }
      toast.success("Room created!");
      router.push(`/room/${data.room.id}`);
    } catch { toast.error("Something went wrong"); setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  // ── Template submit ────────────────────────────────────────────────────────
  async function handleFromTemplate(e) {
    e.preventDefault();
    if (!selectedTemplate) { setTplError("Select a template"); return; }
    setTplLoading(true); setTplError("");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/rooms/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          candidateName: tplCandidateName.trim() || null,
          title: tplTitle.trim() || null,
          pipelineId: tplPipelineId || selectedTemplate.defaultPipelineId || null,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) { toast.error(data.error || "Failed to create room"); setTplError(data.error); return; }
      toast.success("Room created from template!");
      router.push(`/room/${data.room.id}`);
    } catch { toast.error("Something went wrong"); setTplError("Something went wrong"); }
    finally { setTplLoading(false); }
  }

  function handleClose() {
    setTitle(""); setCandidateName(""); setLanguage("javascript");
    setSelectedProblems([]); setProblemSearch(""); setProblemFilter("all"); setError("");
    setSelectedTemplate(null); setTplCandidateName(""); setTplTitle(""); setTplPipelineId(null); setTplError("");
    setPipelineId("");
    setTab("manual");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-[#0a0818] border border-violet-500/20 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl shadow-violet-500/10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">New Interview Room</h2>
            <p className="text-slate-500 text-sm mt-1">Set up your session in seconds</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 hover:text-white flex items-center justify-center transition-all">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-7 p-1 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
          <button type="button" onClick={() => setTab("manual")} className={TAB_CLS(tab === "manual")}>
            <span className="flex items-center justify-center gap-2"><Plus size={14} /> Manual</span>
          </button>
          <button type="button" onClick={() => setTab("template")} className={TAB_CLS(tab === "template")}>
            <span className="flex items-center justify-center gap-2"><LayoutTemplate size={14} /> Use Template</span>
          </button>
        </div>

        {/* ── Manual tab ── */}
        {tab === "manual" && (
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Room Title" placeholder="Frontend Interview — Jane" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} />
              <Input label="Candidate Name (optional)" placeholder="Jane Doe" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Language</label>
              <select
                value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
              >
                {LANGUAGE_LIST.map((l) => <option key={l.id} value={l.id} className="bg-[#0a0818]">{l.label}</option>)}
              </select>
            </div>

            {pipelines.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Add to Pipeline <span className="text-slate-600">(optional)</span>
                </label>
                <select
                  value={pipelineId}
                  onChange={(e) => setPipelineId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                >
                  <option value="" className="bg-[#0a0818]">None</option>
                  {pipelines.map((pl) => (
                    <option key={pl.id} value={pl.id} className="bg-[#0a0818]">{pl.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedProblems.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Selected Problems <span className="text-slate-500">({selectedProblems.length})</span>
                </label>
                <div className="space-y-1.5">
                  {selectedProblems.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                      <span className="text-slate-500 text-xs font-mono w-4 flex-shrink-0">{idx + 1}</span>
                      <GripVertical size={12} className="text-slate-600 flex-shrink-0" />
                      <span className="text-white text-sm flex-1 truncate">{p.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium flex-shrink-0 ${DIFF_CLS[p.difficulty] || ""}`}>
                        {p.difficulty}
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                          className="px-1 py-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 text-xs transition-colors">↑</button>
                        <button type="button" onClick={() => moveDown(idx)} disabled={idx === selectedProblems.length - 1}
                          className="px-1 py-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 text-xs transition-colors">↓</button>
                      </div>
                      <button type="button" onClick={() => removeProblem(p.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Add Problems <span className="text-slate-600">(optional — pick up to 5)</span>
              </label>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text" value={problemSearch} onChange={(e) => setProblemSearch(e.target.value)}
                  placeholder="Search problems…"
                  className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                />
                {["all", "easy", "medium", "hard"].map((d) => (
                  <button key={d} type="button" onClick={() => setProblemFilter(d)}
                    className={`px-3 py-2 text-xs rounded-xl capitalize font-medium border transition-all ${
                      problemFilter === d
                        ? d === "all" ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : DIFF_CLS[d]
                        : "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300"
                    }`}>{d}</button>
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.01]">
                {loadingProblems ? (
                  <div className="p-6 text-slate-500 text-sm text-center">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="p-5 text-slate-600 text-sm text-center">
                    {selectedProblems.length >= 5 ? "Maximum 5 problems selected" : "No more problems to add"}
                  </div>
                ) : (
                  filtered.slice(0, 20).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectedProblems.length < 5 && addProblem(p)}
                      className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors ${
                        selectedProblems.length >= 5
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-white text-sm font-medium truncate">{p.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-slate-600 text-xs capitalize hidden sm:inline">{p.topic}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg capitalize font-medium border ${DIFF_CLS[p.difficulty] || ""}`}>
                          {p.difficulty}
                        </span>
                        <Plus size={13} className="text-slate-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button type="submit" loading={loading} fullWidth>Create Room</Button>
            </div>
          </form>
        )}

        {/* ── Template tab ── */}
        {tab === "template" && (
          <form onSubmit={handleFromTemplate}>
            {loadingTemplates ? (
              <div className="space-y-2 mb-6">
                {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 mb-6">
                <LayoutTemplate size={32} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm font-medium mb-1">No templates yet</p>
                <p className="text-slate-600 text-xs">Create templates from the Templates tab on your dashboard.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">Choose a template</label>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate?.id === t.id
                        ? "bg-violet-500/10 border-violet-500/40"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                        {t.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-lg capitalize">{t.language}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={11} />{t.durationMinutes}m
                        </span>
                        {t.usageCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-600">
                            <Zap size={11} />{t.usageCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {t.problemIds?.length > 0 && (
                      <p className="text-slate-600 text-xs mt-1.5">{t.problemIds.length} problem{t.problemIds.length !== 1 ? "s" : ""} included</p>
                    )}
                    {t.defaultPipelineId && (
                      <p className="text-slate-600 text-xs mt-1">Default pipeline: {pipelines.find(p => p.id === t.defaultPipelineId)?.name || "Unknown"}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedTemplate && (
              <div className="space-y-4 mb-6 pt-4 border-t border-white/[0.06]">
                <Input
                  label="Room Title (optional)"
                  placeholder={`${selectedTemplate.name} — Candidate`}
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                />
                <Input
                  label="Candidate Name (optional)"
                  placeholder="Jane Doe"
                  value={tplCandidateName}
                  onChange={(e) => setTplCandidateName(e.target.value)}
                />
                {pipelines.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Add to Pipeline <span className="text-slate-600">(optional{selectedTemplate.defaultPipelineId ? " — overrides template default" : ""})</span>
                    </label>
                    <select
                      value={tplPipelineId || selectedTemplate.defaultPipelineId || ""}
                      onChange={(e) => setTplPipelineId(e.target.value || null)}
                      className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                    >
                      <option value="" className="bg-[#0a0818]">None</option>
                      {pipelines.map((pl) => (
                        <option key={pl.id} value={pl.id} className="bg-[#0a0818]">
                          {pl.name}{selectedTemplate.defaultPipelineId === pl.id ? " (template default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {tplError && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-400 text-sm">{tplError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button type="submit" loading={tplLoading} fullWidth disabled={!selectedTemplate}>
                Create from Template
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
