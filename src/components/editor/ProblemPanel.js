"use client";

import { useState } from "react";

const difficultyColors = {
  easy: "bg-green-900/30 text-green-400 border-green-800",
  medium: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
  hard: "bg-red-900/30 text-red-400 border-red-800",
};

export default function ProblemPanel({ problem }) {
  const [activeTab, setActiveTab] = useState("description");

  if (!problem) return null;

  const testCases = problem.testCases || [];

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">{problem.title}</h3>
          <span
            className={`px-2 py-0.5 text-xs rounded-full border capitalize ${
              difficultyColors[problem.difficulty]
            }`}
          >
            {problem.difficulty}
          </span>
        </div>
        <span className="text-gray-500 text-xs capitalize bg-gray-800 px-2 py-0.5 rounded">
          {problem.topic}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab("description")}
          className={`px-4 py-2 text-xs font-medium transition-all ${
            activeTab === "description"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Description
        </button>
        <button
          onClick={() => setActiveTab("testcases")}
          className={`px-4 py-2 text-xs font-medium transition-all ${
            activeTab === "testcases"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Test Cases ({testCases.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "description" && (
          <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
            {problem.description}
          </pre>
        )}

        {activeTab === "testcases" && (
          <div className="space-y-4">
            {testCases.map((tc, index) => (
              <div
                key={index}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <h4 className="text-xs font-medium text-gray-400 mb-3">
                  Test Case {index + 1}
                </h4>

                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Input:</span>
                    <pre className="text-green-300 text-sm bg-gray-900 p-2 rounded mt-1">
                      {JSON.stringify(tc.input, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500">Expected Output:</span>
                    <pre className="text-blue-300 text-sm bg-gray-900 p-2 rounded mt-1">
                      {JSON.stringify(tc.expected, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}