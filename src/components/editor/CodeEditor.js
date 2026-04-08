"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { ChevronDown, Plus, X } from "lucide-react";

const LANGUAGE_CONFIG = {
  javascript: { label: "JavaScript", ext: "js",   defaultCode: `// Welcome to CodRoom\n\nfunction solution() {\n  \n}\n` },
  typescript: { label: "TypeScript", ext: "ts",   defaultCode: `// Welcome to CodRoom\n\nfunction solution(): void {\n  \n}\n` },
  python:     { label: "Python",     ext: "py",   defaultCode: `# Welcome to CodRoom\n\ndef solution():\n    pass\n` },
  java:       { label: "Java",       ext: "java", defaultCode: `// Welcome to CodRoom\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n` },
  cpp:        { label: "C++",        ext: "cpp",  defaultCode: `// Welcome to CodRoom\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n` },
  csharp:     { label: "C#",         ext: "cs",   defaultCode: `// Welcome to CodRoom\n\nusing System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}\n` },
  go:         { label: "Go",         ext: "go",   defaultCode: `// Welcome to CodRoom\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n` },
  rust:       { label: "Rust",       ext: "rs",   defaultCode: `// Welcome to CodRoom\n\nfn main() {\n    \n}\n` },
};

const LANG_COLORS = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  java: "#b07219", cpp: "#f34b7d", csharp: "#178600",
  go: "#00ADD8", rust: "#dea584",
};

/** Build the initial files map for a given language + optional starter code. */
function buildInitialFiles(language, starterCode) {
  const cfg = LANGUAGE_CONFIG[language] ?? LANGUAGE_CONFIG.javascript;
  const filename = `solution.${cfg.ext}`;
  return { [filename]: starterCode || cfg.defaultCode };
}

/** Derive a unique new filename that doesn't clash with existing tabs. */
function nextFilename(language, existing) {
  const ext = LANGUAGE_CONFIG[language]?.ext ?? "js";
  let i = 2;
  while (existing.includes(`solution${i}.${ext}`)) i++;
  return `solution${i}.${ext}`;
}

export default function CodeEditor({
  language = "javascript",
  onLanguageChange,
  files,           // { [filename]: code }
  activeFile,      // string
  onActiveFileChange,
  onFileChange,    // (filename, code) => void
  onFilesChange,   // (newFiles, newActive) => void  — for add/close
}) {
  const [editorReady, setEditorReady] = useState(false);
  const langColor = LANG_COLORS[language] || "#888";
  const filenames = Object.keys(files ?? {});

  const handleAddFile = useCallback(() => {
    const name = nextFilename(language, filenames);
    const cfg  = LANGUAGE_CONFIG[language] ?? LANGUAGE_CONFIG.javascript;
    const newFiles = { ...files, [name]: cfg.defaultCode };
    onFilesChange?.(newFiles, name);
  }, [language, filenames, files, onFilesChange]);

  const handleCloseFile = useCallback((name, e) => {
    e.stopPropagation();
    if (filenames.length <= 1) return; // always keep at least one tab
    const newFiles = { ...files };
    delete newFiles[name];
    const newActive = name === activeFile
      ? Object.keys(newFiles)[0]
      : activeFile;
    onFilesChange?.(newFiles, newActive);
  }, [filenames, files, activeFile, onFilesChange]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d18]">
      {/* Tab bar */}
      <div className="flex items-center bg-[#111118] border-b border-white/[0.06] flex-shrink-0 min-h-[36px]">
        {/* File tabs — scrollable */}
        <div className="flex items-end overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {filenames.map((name) => {
            const active = name === activeFile;
            return (
              <button
                key={name}
                onClick={() => onActiveFileChange?.(name)}
                className={`group flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-r border-white/[0.04] transition-colors flex-shrink-0 ${
                  active
                    ? "bg-[#0d0d18] text-slate-200 border-t-2 border-t-violet-500"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border-t-2 border-t-transparent"
                }`}
              >
                <span style={{ color: active ? langColor : undefined }} className="text-[10px]">●</span>
                {name}
                {filenames.length > 1 && (
                  <span
                    onClick={(e) => handleCloseFile(name, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity ml-0.5 leading-none"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>
            );
          })}

          {/* Add file */}
          <button
            onClick={handleAddFile}
            className="flex-shrink-0 px-2 py-2 text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
            title="New file"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Language selector + status — right-aligned, never scrolls */}
        <div className="flex items-center gap-3 px-3 flex-shrink-0">
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
          language={language}
          value={files?.[activeFile] ?? ""}
          onChange={(v) => onFileChange?.(activeFile, v || "")}
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

export { LANGUAGE_CONFIG, buildInitialFiles };
