"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { X, Plus, GripVertical } from "lucide-react";

const DIFF_CLS = {
  easy:   "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  hard:   "bg-rose-500/10 border-rose-500/20 text-rose-300",
};

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python",     label: "Python" },
  { value: "java",       label: "Java" },
  { value: "cpp",        label: "C++" },
  { value: "csharp",     label: "C#" },
  { value: "go",         label: "Go" },
  { value: "rust",       label: "Rust" },
  { value: "typescript", label: "TypeScript" },
];

export default function CreateRoomModal({ isOpen, onClose }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]); // ordered array of problem objects
  const [problemSearch, setProblemSearch] = useState("");
  const [problemFilter, setProblemFilter] = useState("all");
  const [loadingProblems, setLoadingProblems] = useState(false);

  useEffect(() => { if (isOpen) fetchProblems(); }, [isOpen]);

  async function fetchProblems() {
    setLoadingProblems(true);
    try {
      const res = await fetch("/api/problems");
      const data = await res.json();
      if (res.ok) setProblems(data.problems);
    } catch { } finally { setLoadingProblems(false); }
  }

  const selectedIds = new Set(selectedProblems.map((p) => p.id));

  const filtered = problems.filter((p) =>
    !selectedIds.has(p.id) &&
    (problemFilter === "all" || p.difficulty === problemFilter) &&
    (!problemSearch || p.title.toLowerCase().includes(problemSearch.toLowerCase()))
  );

  function addProblem(p) {
    setSelectedProblems((prev) => [...prev, p]);
  }

  function removeProblem(id) {
    setSelectedProblems((prev) => prev.filter((p) => p.id !== id));
  }

  function moveUp(idx) {
    if (idx === 0) return;
    setSelectedProblems((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx) {
    setSelectedProblems((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Room title is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          candidateName: candidateName.trim() || null,
          language,
          problemIds: selectedProblems.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create room"); setError(data.error); return; }
      toast.success("Room created!");
      router.push(`/room/${data.room.id}`);
    } catch { toast.error("Something went wrong"); setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  function handleClose() {
    setTitle(""); setCandidateName(""); setLanguage("javascript");
    setSelectedProblems([]); setProblemSearch(""); setProblemFilter("all"); setError("");
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">New Interview Room</h2>
            <p className="text-slate-500 text-sm mt-1">Set up your session in seconds</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 hover:text-white flex items-center justify-center transition-all">✕</button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Room Title" placeholder="Frontend Interview — Jane" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} />
            <Input label="Candidate Name (optional)" placeholder="Jane Doe" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          </div>

          {/* Language */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-2">Default Language</label>
            <select
              value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
            >
              {LANGUAGES.map((l) => <option key={l.value} value={l.value} className="bg-[#0a0818]">{l.label}</option>)}
            </select>
          </div>

          {/* Selected problems queue */}
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

          {/* Problem picker */}
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
      </div>
    </div>
  );
}
