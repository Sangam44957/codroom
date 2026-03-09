"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

const LANGUAGE_CONFIG = {
  javascript: {
    label: "JavaScript",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\nfunction solution() {\n  \n}\n`,
  },
  python: {
    label: "Python",
    defaultCode: `# Welcome to CodRoom\n# Start coding here\n\ndef solution():\n    pass\n`,
  },
  java: {
    label: "Java",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`,
  },
  cpp: {
    label: "C++",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n`,
  },
  csharp: {
    label: "C#",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\nusing System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}\n`,
  },
  go: {
    label: "Go",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n`,
  },
  rust: {
    label: "Rust",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\nfn main() {\n    \n}\n`,
  },
  typescript: {
    label: "TypeScript",
    defaultCode: `// Welcome to CodRoom\n// Start coding here\n\nfunction solution(): void {\n  \n}\n`,
  },
};

export default function CodeEditor({
  language = "javascript",
  onLanguageChange,
  code,
  onCodeChange,
}) {
  const [editorReady, setEditorReady] = useState(false);

  function getMonacoLanguage(lang) {
    const map = {
      javascript: "javascript",
      python: "python",
      java: "java",
      cpp: "cpp",
      csharp: "csharp",
      go: "go",
      rust: "rust",
      typescript: "typescript",
    };
    return map[lang] || "javascript";
  }

  function handleEditorMount() {
    setEditorReady(true);
  }

  function handleLanguageChange(e) {
    const newLang = e.target.value;
    onLanguageChange(newLang);
    onCodeChange(LANGUAGE_CONFIG[newLang]?.defaultCode || "");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Language:</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {editorReady ? (
            <span className="text-green-400 text-xs flex items-center gap-1">
              ● Editor Ready
            </span>
          ) : (
            <span className="text-yellow-400 text-xs flex items-center gap-1">
              ● Loading Editor...
            </span>
          )}
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={(value) => onCodeChange(value || "")}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16 },
            lineNumbers: "on",
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
          }}
        />
      </div>
    </div>
  );
}

export { LANGUAGE_CONFIG };
