"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { ChevronDown } from "lucide-react";

const LANGUAGE_CONFIG = {
  javascript: { label: "JavaScript",  defaultCode: `// Welcome to CodRoom\n\nfunction solution() {\n  \n}\n` },
  typescript: { label: "TypeScript",  defaultCode: `// Welcome to CodRoom\n\nfunction solution(): void {\n  \n}\n` },
  python:     { label: "Python",      defaultCode: `# Welcome to CodRoom\n\ndef solution():\n    pass\n` },
  java:       { label: "Java",        defaultCode: `// Welcome to CodRoom\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n` },
  cpp:        { label: "C++",         defaultCode: `// Welcome to CodRoom\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n` },
  csharp:     { label: "C#",          defaultCode: `// Welcome to CodRoom\n\nusing System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}\n` },
  go:         { label: "Go",          defaultCode: `// Welcome to CodRoom\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n` },
  rust:       { label: "Rust",        defaultCode: `// Welcome to CodRoom\n\nfn main() {\n    \n}\n` },
};

const LANG_COLORS = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  java: "#b07219", cpp: "#f34b7d", csharp: "#178600",
  go: "#00ADD8", rust: "#dea584",
};

export default function CodeEditor({ language = "javascript", onLanguageChange, code, onCodeChange }) {
  const [editorReady, setEditorReady] = useState(false);

  const langColor = LANG_COLORS[language] || "#888";

  return (
    <div className="flex flex-col h-full bg-[#0d0d18]">
      {/* Editor tab bar — VS Code style */}
      <div className="flex items-center justify-between px-3 h-9 bg-[#111118] border-b border-white/[0.06] flex-shrink-0">
        {/* Active file tab */}
        <div className="flex items-center gap-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d18] border-t border-l border-r border-white/[0.07] rounded-t text-xs text-slate-300 -mb-px">
            <span style={{ color: langColor }} className="text-[10px]">●</span>
            solution.{language === "python" ? "py" : language === "java" ? "java" : language === "cpp" ? "cpp" : language === "csharp" ? "cs" : language === "go" ? "go" : language === "rust" ? "rs" : language === "typescript" ? "ts" : "js"}
          </div>
        </div>

        {/* Language selector + status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="appearance-none pl-2 pr-6 py-1 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] rounded text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer transition-all"
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-[#111118]">{cfg.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <span className={`text-[10px] flex items-center gap-1 ${editorReady ? "text-emerald-500" : "text-amber-500"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
            {editorReady ? "Ready" : "Loading"}
          </span>
        </div>
      </div>

      {/* Monaco */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
          value={code}
          onChange={(v) => onCodeChange(v || "")}
          onMount={() => setEditorReady(true)}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            roundedSelection: true,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            renderLineHighlight: "line",
            scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
          }}
        />
      </div>
    </div>
  );
}

export { LANGUAGE_CONFIG };
