"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";

const SNIPPETS = {
  javascript: [
    { label: "Binary Search", code: `function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? (lo = mid + 1) : (hi = mid - 1);\n  }\n  return -1;\n}` },
    { label: "Two Pointers", code: `let left = 0, right = arr.length - 1;\nwhile (left < right) {\n  // process arr[left] and arr[right]\n  left++;\n  right--;\n}` },
    { label: "Sliding Window", code: `let start = 0, maxLen = 0;\nconst map = new Map();\nfor (let end = 0; end < s.length; end++) {\n  // expand window\n  while (/* invalid */) { start++; }\n  maxLen = Math.max(maxLen, end - start + 1);\n}` },
    { label: "DFS (recursive)", code: `function dfs(node, visited = new Set()) {\n  if (!node || visited.has(node)) return;\n  visited.add(node);\n  for (const neighbor of node.neighbors) dfs(neighbor, visited);\n}` },
    { label: "BFS", code: `function bfs(root) {\n  const queue = [root], visited = new Set([root]);\n  while (queue.length) {\n    const node = queue.shift();\n    for (const neighbor of node.neighbors) {\n      if (!visited.has(neighbor)) {\n        visited.add(neighbor);\n        queue.push(neighbor);\n      }\n    }\n  }\n}` },
    { label: "HashMap frequency", code: `const freq = new Map();\nfor (const x of arr) freq.set(x, (freq.get(x) ?? 0) + 1);` },
    { label: "Min Heap (sorted)", code: `// JS has no built-in heap; use sorted array for small inputs\nconst heap = [];\nheap.push(val);\nheap.sort((a, b) => a - b); // min at index 0` },
    { label: "Linked List Node", code: `class ListNode {\n  constructor(val = 0, next = null) {\n    this.val = val;\n    this.next = next;\n  }\n}` },
    { label: "Tree Node", code: `class TreeNode {\n  constructor(val = 0, left = null, right = null) {\n    this.val = val;\n    this.left = left;\n    this.right = right;\n  }\n}` },
  ],
  typescript: [
    { label: "Binary Search", code: `function binarySearch(arr: number[], target: number): number {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? (lo = mid + 1) : (hi = mid - 1);\n  }\n  return -1;\n}` },
    { label: "Two Pointers", code: `let left = 0, right = arr.length - 1;\nwhile (left < right) {\n  left++;\n  right--;\n}` },
    { label: "HashMap frequency", code: `const freq = new Map<number, number>();\nfor (const x of arr) freq.set(x, (freq.get(x) ?? 0) + 1);` },
    { label: "Tree Node", code: `class TreeNode {\n  val: number;\n  left: TreeNode | null;\n  right: TreeNode | null;\n  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {\n    this.val = val; this.left = left; this.right = right;\n  }\n}` },
  ],
  python: [
    { label: "Binary Search", code: `def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1` },
    { label: "Two Pointers", code: `left, right = 0, len(arr) - 1\nwhile left < right:\n    # process arr[left] and arr[right]\n    left += 1\n    right -= 1` },
    { label: "Sliding Window", code: `from collections import defaultdict\nstart = max_len = 0\nwindow = defaultdict(int)\nfor end, ch in enumerate(s):\n    window[ch] += 1\n    while len(window) > k:\n        window[s[start]] -= 1\n        if window[s[start]] == 0:\n            del window[s[start]]\n        start += 1\n    max_len = max(max_len, end - start + 1)` },
    { label: "DFS (recursive)", code: `def dfs(node, visited=None):\n    if visited is None:\n        visited = set()\n    if node in visited:\n        return\n    visited.add(node)\n    for neighbor in graph[node]:\n        dfs(neighbor, visited)` },
    { label: "BFS", code: `from collections import deque\ndef bfs(root):\n    queue = deque([root])\n    visited = {root}\n    while queue:\n        node = queue.popleft()\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)` },
    { label: "Counter / frequency", code: `from collections import Counter\nfreq = Counter(arr)` },
    { label: "Heap (min)", code: `import heapq\nheap = []\nheapq.heappush(heap, val)\nmin_val = heapq.heappop(heap)` },
    { label: "Tree Node", code: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right` },
  ],
  java: [
    { label: "Binary Search", code: `int binarySearch(int[] arr, int target) {\n    int lo = 0, hi = arr.length - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}` },
    { label: "HashMap frequency", code: `Map<Integer, Integer> freq = new HashMap<>();\nfor (int x : arr) freq.merge(x, 1, Integer::sum);` },
    { label: "BFS", code: `Queue<Integer> queue = new LinkedList<>();\nSet<Integer> visited = new HashSet<>();\nqueue.offer(start);\nvisited.add(start);\nwhile (!queue.isEmpty()) {\n    int node = queue.poll();\n    for (int neighbor : graph.get(node)) {\n        if (!visited.contains(neighbor)) {\n            visited.add(neighbor);\n            queue.offer(neighbor);\n        }\n    }\n}` },
    { label: "Min Heap", code: `PriorityQueue<Integer> minHeap = new PriorityQueue<>();\nminHeap.offer(val);\nint min = minHeap.poll();` },
  ],
  cpp: [
    { label: "Binary Search", code: `int binarySearch(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}` },
    { label: "HashMap frequency", code: `unordered_map<int, int> freq;\nfor (int x : arr) freq[x]++;` },
    { label: "BFS", code: `queue<int> q;\nunordered_set<int> visited;\nq.push(start);\nvisited.insert(start);\nwhile (!q.empty()) {\n    int node = q.front(); q.pop();\n    for (int neighbor : graph[node]) {\n        if (!visited.count(neighbor)) {\n            visited.insert(neighbor);\n            q.push(neighbor);\n        }\n    }\n}` },
    { label: "Min Heap", code: `priority_queue<int, vector<int>, greater<int>> minHeap;\nminHeap.push(val);\nint top = minHeap.top(); minHeap.pop();` },
  ],
  go: [
    { label: "Binary Search", code: `func binarySearch(arr []int, target int) int {\n\tlo, hi := 0, len(arr)-1\n\tfor lo <= hi {\n\t\tmid := lo + (hi-lo)/2\n\t\tif arr[mid] == target {\n\t\t\treturn mid\n\t\t} else if arr[mid] < target {\n\t\t\tlo = mid + 1\n\t\t} else {\n\t\t\thi = mid - 1\n\t\t}\n\t}\n\treturn -1\n}` },
    { label: "HashMap frequency", code: `freq := make(map[int]int)\nfor _, x := range arr {\n\tfreq[x]++\n}` },
  ],
  rust: [
    { label: "Binary Search", code: `fn binary_search(arr: &[i32], target: i32) -> Option<usize> {\n    let (mut lo, mut hi) = (0usize, arr.len());\n    while lo < hi {\n        let mid = lo + (hi - lo) / 2;\n        match arr[mid].cmp(&target) {\n            std::cmp::Ordering::Equal => return Some(mid),\n            std::cmp::Ordering::Less => lo = mid + 1,\n            std::cmp::Ordering::Greater => hi = mid,\n        }\n    }\n    None\n}` },
    { label: "HashMap frequency", code: `use std::collections::HashMap;\nlet mut freq: HashMap<i32, usize> = HashMap::new();\nfor &x in arr {\n    *freq.entry(x).or_insert(0) += 1;\n}` },
  ],
};

export default function SnippetLibrary({ language, onInsert, onClose }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const snippets = SNIPPETS[language] ?? SNIPPETS.javascript;
  const filtered = query
    ? snippets.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
    : snippets;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111118] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="text-sm font-bold text-white">Snippet Library</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2">
          <Search size={13} className="text-slate-500 flex-shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search snippets…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
          />
        </div>

        {/* Snippet list */}
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-6">No snippets found</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.label}
                onClick={() => { onInsert(s.code); onClose(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
              >
                <span className="text-sm text-slate-300 font-medium">{s.label}</span>
                <pre className="text-[10px] text-slate-600 mt-0.5 truncate font-mono">
                  {s.code.split("\n")[0]}
                </pre>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.06]">
          <p className="text-xs text-slate-600">Press Esc to close · Click to insert at cursor</p>
        </div>
      </div>
    </div>
  );
}
