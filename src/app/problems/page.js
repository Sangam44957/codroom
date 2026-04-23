"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import { toast } from "sonner";

const TOPICS = ["arrays", "strings", "stacks", "math", "linked-lists", "trees", "graphs", "design", "other"];
const DIFFICULTIES = ["all", "easy", "medium", "hard"];
const COMPANIES = ["google", "meta", "amazon", "microsoft", "stripe", "apple"];

const DIFF_CLS = {
  easy:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function CreateProblemModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: "", difficulty: "easy", topic: "arrays", starterCode: "",
    companies: "", estimatedTime: "", isPublic: false, tags: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k) { return (e) => setForm((p) => ({ ...p, [k]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companies: form.companies ? form.companies.split(",").map((c) => c.trim()).filter(Boolean) : [],
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          estimatedTime: form.estimatedTime ? parseInt(form.estimatedTime, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      toast.success("Problem created!");
      onCreated(data.problem);
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  const inputCls = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all text-sm";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#0a0818] border border-violet-500/20 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-violet-500/10"
      >
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-black text-white">Create Problem</h2>
            <p className="text-slate-500 text-sm mt-1">Add a custom problem to your bank</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 hover:text-white flex items-center justify-center transition-all">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input type="text" placeholder="Two Sum" value={form.title} onChange={set("title")} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
              <select value={form.difficulty} onChange={set("difficulty")} className={inputCls}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Topic</label>
              <select value={form.topic} onChange={set("topic")} className={inputCls}>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              rows={5} placeholder="Describe the problem clearly..."
              value={form.description} onChange={set("description")}
              className={inputCls + " resize-none"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Starter Code <span className="text-slate-600">(optional)</span></label>
            <textarea
              rows={4} placeholder={"function twoSum(nums, target) {\n  // your code here\n}"}
              value={form.starterCode} onChange={set("starterCode")}
              className={inputCls + " resize-none font-mono text-xs"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Companies <span className="text-slate-600">(comma-separated)</span></label>
              <input type="text" placeholder="google, stripe" value={form.companies} onChange={set("companies")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Est. Time <span className="text-slate-600">(minutes)</span></label>
              <input type="number" placeholder="30" min="1" value={form.estimatedTime} onChange={set("estimatedTime")} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tags <span className="text-slate-600">(comma-separated)</span></label>
            <input type="text" placeholder="two-pointers, hash-map" value={form.tags} onChange={set("tags")} className={inputCls} />
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isPublic" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="w-4 h-4 accent-violet-500" />
            <label htmlFor="isPublic" className="text-sm text-slate-300">Make public <span className="text-slate-600">(visible to all users)</span></label>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-white/[0.08] text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40">
              {loading ? "Creating…" : "Create Problem"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ProblemsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [problems, setProblems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [topic, setTopic] = useState("all");
  const [company, setCompany] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return; }
      return r.json();
    }).then((d) => d && setUser(d.user));
  }, [router]);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (difficulty !== "all") params.set("difficulty", difficulty);
      if (topic !== "all") params.set("topic", topic);
      if (company !== "all") params.set("company", company);
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/problems?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProblems(data.problems);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally { setLoading(false); }
  }, [difficulty, topic, company, search, page]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [difficulty, topic, company, search]);

  async function handleDelete(e, problem) {
    e.stopPropagation();
    if (!confirm(`Delete "${problem.title}"? This cannot be undone.`)) return;
    setDeleting(problem.id);
    try {
      const res = await fetch(`/api/problems?id=${problem.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Problem deleted");
        setProblems((p) => p.filter((x) => x.id !== problem.id));
        if (selectedProblem?.id === problem.id) setSelectedProblem(null);
      } else toast.error("Delete failed");
    } finally { setDeleting(null); }
  }

  return (
    <div className="min-h-screen bg-[#04040f]">
      <div className="ambient-orbs"><div className="orb orb-violet" /><div className="orb orb-cyan" /></div>
      <div className="dot-grid fixed inset-0 pointer-events-none z-0 opacity-30" />

      <div className="relative z-10">
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Problem Bank</h1>
              <p className="text-slate-500 text-sm mt-1">{total} problem{total !== 1 ? "s" : ""} available</p>
            </div>
            <motion.button
              onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all"
            >
              <Plus size={16} /> Create Problem
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems…"
              className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-56 transition-all"
            />
            <div className="flex items-center gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`px-3 py-2 text-xs rounded-xl capitalize font-medium border transition-all ${
                    difficulty === d
                      ? d === "all" ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                        : DIFF_CLS[d]
                      : "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300"
                  }`}>{d}</button>
              ))}
            </div>
            <div className="relative">
              <select value={topic} onChange={(e) => setTopic(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-[#0a0818] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all">
                <option value="all" className="bg-[#0a0818] text-white">All Topics</option>
                {TOPICS.map((t) => <option key={t} value={t} className="bg-[#0a0818] text-white">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={company} onChange={(e) => setCompany(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-[#0a0818] border border-white/[0.07] hover:border-white/[0.12] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all">
                <option value="all" className="bg-[#0a0818] text-white">All Companies</option>
                {COMPANIES.map((c) => <option key={c} value={c} className="bg-[#0a0818] text-white capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-5">
            {/* List */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-2">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="skeleton h-14 rounded-xl" />
                  ))}
                </div>
              ) : problems.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500">No problems found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {problems.map((problem) => (
                      <motion.div
                        key={problem.id}
                        onClick={() => setSelectedProblem(problem)}
                        whileHover={{ x: 2 }}
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${
                          selectedProblem?.id === problem.id
                            ? "bg-violet-500/10 border-violet-500/30"
                            : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <h3 className="text-white text-sm font-medium truncate">{problem.title}</h3>
                          {problem.isOwn && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-md flex-shrink-0">Mine</span>
                          )}
                          {problem.isPublic && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-md flex-shrink-0">Public</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {problem.estimatedTime && (
                            <span className="text-slate-600 text-xs hidden lg:inline">{problem.estimatedTime}m</span>
                          )}
                          <span className="text-slate-600 text-xs capitalize hidden sm:inline">{problem.topic}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-lg border capitalize font-medium ${DIFF_CLS[problem.difficulty] || ""}`}>
                            {problem.difficulty}
                          </span>
                          {problem.isOwn && (
                            <button
                              onClick={(e) => handleDelete(e, problem)}
                              disabled={deleting === problem.id}
                              className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-40"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 rounded-xl border border-white/[0.07] text-slate-400 hover:text-white hover:border-white/[0.15] disabled:opacity-30 transition-all">
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 rounded-xl border border-white/[0.07] text-slate-400 hover:text-white hover:border-white/[0.15] disabled:opacity-30 transition-all">
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Detail panel */}
            <AnimatePresence>
              {selectedProblem && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-[420px] flex-shrink-0 bg-[#0a0818] border border-white/[0.07] rounded-2xl p-6 h-fit sticky top-8 max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="text-lg font-bold text-white leading-snug">{selectedProblem.title}</h2>
                    <button onClick={() => setSelectedProblem(null)} className="text-slate-600 hover:text-slate-300 flex-shrink-0 mt-0.5">
                      <X size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className={`text-xs px-2.5 py-1 rounded-lg border capitalize font-medium ${DIFF_CLS[selectedProblem.difficulty] || ""}`}>
                      {selectedProblem.difficulty}
                    </span>
                    <span className="text-xs px-2.5 py-1 bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-lg capitalize">
                      {selectedProblem.topic}
                    </span>
                    {selectedProblem.estimatedTime && (
                      <span className="text-xs px-2.5 py-1 bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-lg">
                        ~{selectedProblem.estimatedTime}m
                      </span>
                    )}
                    {selectedProblem.companies?.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg capitalize">{c}</span>
                    ))}
                  </div>

                  {selectedProblem.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {selectedProblem.tags.map((tag) => (
                        <span key={tag.id || tag.name} className="text-[11px] px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-md">
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-5 font-sans">
                    {selectedProblem.description}
                  </pre>

                  {selectedProblem.starterCode && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Starter Code</p>
                      <pre className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl text-emerald-300 text-xs overflow-x-auto font-mono leading-relaxed">
                        {selectedProblem.starterCode}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateProblemModal
            onClose={() => setShowCreate(false)}
            onCreated={(p) => {
              setProblems((prev) => [{ ...p, isOwn: true }, ...prev]);
              setShowCreate(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
