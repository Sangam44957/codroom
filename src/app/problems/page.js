"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/ui/Navbar";

const TOPICS = [
  "all", "arrays", "strings", "stacks", "math",
  "linked-lists", "trees", "graphs", "design",
];

const DIFFICULTIES = ["all", "easy", "medium", "hard"];

const difficultyColors = {
  easy: "bg-green-900/30 text-green-400 border-green-800",
  medium: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
  hard: "bg-red-900/30 text-red-400 border-red-800",
};

export default function ProblemsPage() {
  const [user, setUser] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [topic, setTopic] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProblem, setSelectedProblem] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, topic, search]);

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Not logged in
    }
  }

  async function fetchProblems() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (difficulty !== "all") params.set("difficulty", difficulty);
      if (topic !== "all") params.set("topic", topic);
      if (search) params.set("search", search);

      const res = await fetch(`/api/problems?${params}`);
      const data = await res.json();

      if (res.ok) {
        setProblems(data.problems);
      }
    } catch {
      console.error("Failed to fetch problems");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Problem Bank</h1>
          <p className="text-gray-400 mt-1">
            {problems.length} problem{problems.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Difficulty:</span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-all ${
                  difficulty === d
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Topic Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Topic:</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All Topics" : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Problem List */}
          <div className="flex-1">
            {loading ? (
              <div className="text-gray-400 text-center py-10">Loading...</div>
            ) : problems.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-400">No problems found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {problems.map((problem) => (
                  <div
                    key={problem.id}
                    onClick={() => setSelectedProblem(problem)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedProblem?.id === problem.id
                        ? "bg-gray-800 border-blue-600"
                        : "bg-gray-900 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">{problem.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs capitalize">
                          {problem.topic}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full border capitalize ${
                            difficultyColors[problem.difficulty]
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Problem Detail */}
          {selectedProblem && (
            <div className="w-[450px] bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit sticky top-8 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  {selectedProblem.title}
                </h2>
                <span
                  className={`px-3 py-1 text-xs rounded-full border capitalize ${
                    difficultyColors[selectedProblem.difficulty]
                  }`}
                >
                  {selectedProblem.difficulty}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-gray-500 text-xs capitalize bg-gray-800 px-2 py-1 rounded">
                  {selectedProblem.topic}
                </span>
              </div>

              <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed mb-6">
                {selectedProblem.description}
              </pre>

              {selectedProblem.starterCode && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Starter Code:
                  </h4>
                  <pre className="bg-gray-800 p-3 rounded-lg text-green-300 text-sm overflow-x-auto">
                    {selectedProblem.starterCode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}