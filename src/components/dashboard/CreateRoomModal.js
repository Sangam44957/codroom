"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const difficultyColors = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

export default function CreateRoomModal({ isOpen, onClose }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Problem selection
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [problemSearch, setProblemSearch] = useState("");
  const [problemFilter, setProblemFilter] = useState("all");
  const [loadingProblems, setLoadingProblems] = useState(false);

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "typescript", label: "TypeScript" },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchProblems();
    }
  }, [isOpen]);

  async function fetchProblems() {
    setLoadingProblems(true);
    try {
      const res = await fetch("/api/problems");
      const data = await res.json();
      if (res.ok) {
        setProblems(data.problems);
      }
    } catch {
      console.error("Failed to fetch problems");
    } finally {
      setLoadingProblems(false);
    }
  }

  // Filter problems
  const filteredProblems = problems.filter((p) => {
    const matchesDifficulty = problemFilter === "all" || p.difficulty === problemFilter;
    const matchesSearch = !problemSearch || p.title.toLowerCase().includes(problemSearch.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  async function handleCreate(e) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Room title is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          candidateName: candidateName.trim() || null,
          language,
          problemId: selectedProblemId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push(`/room/${data.room.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTitle("");
    setCandidateName("");
    setLanguage("javascript");
    setSelectedProblemId("");
    setProblemSearch("");
    setProblemFilter("all");
    setError("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Interview Room</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate}>
          {/* Room Details */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room Title"
              placeholder="e.g. Frontend Interview - John"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
            />
            <Input
              label="Candidate Name (optional)"
              placeholder="e.g. John Doe"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>

          {/* Language */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Default Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Problem Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Problem (optional)
            </label>

            {/* Problem Filters */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                placeholder="Search problems..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {["all", "easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setProblemFilter(d)}
                  className={`px-3 py-2 text-xs rounded-lg capitalize transition-all ${
                    problemFilter === d
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Problem List */}
            <div className="max-h-48 overflow-y-auto border border-gray-800 rounded-lg">
              {loadingProblems ? (
                <div className="p-4 text-gray-500 text-sm text-center">Loading problems...</div>
              ) : filteredProblems.length === 0 ? (
                <div className="p-4 text-gray-500 text-sm text-center">No problems found</div>
              ) : (
                <>
                  {/* No problem option */}
                  <div
                    onClick={() => setSelectedProblemId("")}
                    className={`px-4 py-3 cursor-pointer transition-all border-b border-gray-800 ${
                      selectedProblemId === ""
                        ? "bg-gray-800"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    <span className="text-gray-400 text-sm">No problem (free coding)</span>
                  </div>

                  {filteredProblems.map((problem) => (
                    <div
                      key={problem.id}
                      onClick={() => setSelectedProblemId(problem.id)}
                      className={`px-4 py-3 cursor-pointer transition-all border-b border-gray-800 last:border-0 ${
                        selectedProblemId === problem.id
                          ? "bg-blue-900/20 border-l-2 border-l-blue-500"
                          : "hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">{problem.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs capitalize">{problem.topic}</span>
                          <span className={`text-xs capitalize ${difficultyColors[problem.difficulty]}`}>
                            {problem.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {selectedProblemId && (
              <p className="text-blue-400 text-xs mt-2">
                ✓ Problem selected: {problems.find((p) => p.id === selectedProblemId)?.title}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} fullWidth>
              Create Room
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}