"use client";

import { useMemo, useState } from "react";
import { Bot, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

const QUESTION_BANK = {
  recursion: [
    "Can you walk me through the base case of your recursive solution?",
    "What's the call stack depth for your worst-case input?",
    "How would you convert this to an iterative approach?",
  ],
  "dynamic programming": [
    "Can you identify the overlapping subproblems here?",
    "What's your memoization strategy — top-down or bottom-up?",
    "How does your DP table relate to the recurrence relation?",
  ],
  "time complexity": [
    "Can you formally derive the Big-O for this solution?",
    "Is there a more optimal approach — what's the theoretical lower bound?",
    "How does the complexity change if the input is already sorted?",
  ],
  "space complexity": [
    "Can you reduce the auxiliary space usage here?",
    "Does your solution use O(1) extra space or O(n)?",
    "How would in-place modification affect correctness?",
  ],
  "binary search": [
    "Why did you choose binary search here — what property enables it?",
    "How do you handle the off-by-one in your mid calculation?",
    "Can you extend this to a rotated sorted array?",
  ],
  "hash map": [
    "What's the worst-case lookup time for your hash map?",
    "How would you handle hash collisions in a custom implementation?",
    "Could you solve this without extra space using a different approach?",
  ],
  "linked list": [
    "How do you handle the edge case of a single-node list?",
    "Can you do this in a single pass without extra space?",
    "How would you detect a cycle in this list?",
  ],
  tree: [
    "What traversal order does your solution use and why?",
    "How does your solution handle an unbalanced tree?",
    "Can you solve this iteratively using an explicit stack?",
  ],
  graph: [
    "How do you handle disconnected components in your graph?",
    "What's the difference between BFS and DFS for this problem?",
    "How would you detect a cycle in a directed graph?",
  ],
  sorting: [
    "Why did you choose this sorting algorithm over others?",
    "What's the best-case complexity of your sort?",
    "How would you sort this if the values are bounded integers?",
  ],
  "two pointers": [
    "Why does the two-pointer approach work here — what invariant do you maintain?",
    "How do you handle duplicates with this technique?",
    "Can you extend this to three pointers?",
  ],
  "sliding window": [
    "How do you decide when to shrink the window?",
    "What's the invariant your window maintains?",
    "How would you handle negative numbers in the window?",
  ],
  "edge case": [
    "What happens with an empty input?",
    "Have you considered integer overflow for large inputs?",
    "What if all elements are identical?",
  ],
  optimization: [
    "What bottleneck are you targeting with this optimization?",
    "Is there a trade-off between time and space here?",
    "How would you profile this in production?",
  ],
};

const KEYWORDS = Object.keys(QUESTION_BANK);

function detectTopics(messages) {
  const text = messages
    .filter((m) => m.role !== "system")
    .map((m) => m.text?.toLowerCase() || "")
    .join(" ");
  return KEYWORDS.filter((kw) => text.includes(kw));
}

export default function AIAssistant({ messages, onCopyToChat }) {
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(null);

  const topics = useMemo(() => detectTopics(messages), [messages]);

  function handleCopy(question) {
    onCopyToChat?.(question);
    setCopied(question);
    setTimeout(() => setCopied(null), 2000);
  }

  function toggleTopic(topic) {
    setExpanded((prev) => ({ ...prev, [topic]: !prev[topic] }));
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <Bot size={13} className="text-violet-400" />
        <span className="text-xs font-semibold text-slate-300">AI Interview Assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {topics.length === 0 ? (
          <div className="text-center py-8">
            <Bot size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-xs leading-relaxed">
              Listening for topics…
              <br />
              Start chatting to get follow-up suggestions.
            </p>
          </div>
        ) : (
          topics.map((topic) => (
            <div
              key={topic}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleTopic(topic)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-xs font-semibold text-violet-300 capitalize">{topic}</span>
                {expanded[topic] ? (
                  <ChevronUp size={12} className="text-slate-500" />
                ) : (
                  <ChevronDown size={12} className="text-slate-500" />
                )}
              </button>

              {expanded[topic] && (
                <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
                  {QUESTION_BANK[topic].map((q) => (
                    <div
                      key={q}
                      className="flex items-start gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors group"
                    >
                      <p className="flex-1 text-xs text-slate-400 leading-relaxed">{q}</p>
                      <button
                        onClick={() => handleCopy(q)}
                        className="flex-shrink-0 mt-0.5 p-1 rounded text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Copy to chat input"
                      >
                        {copied === q ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex-shrink-0 px-3 py-2 border-t border-white/[0.05]">
        <p className="text-[10px] text-slate-700 text-center">
          {topics.length} topic{topics.length !== 1 ? "s" : ""} detected · Click a question to copy to chat
        </p>
      </div>
    </div>
  );
}
