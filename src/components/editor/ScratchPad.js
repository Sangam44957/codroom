"use client";

import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { FileText, Save, Trash2, Plus, X } from "lucide-react";

const SCRATCH_TEMPLATES = {
  javascript: `// Interviewer Notes & Code Snippets

// Quick test:
function test() {
  console.log("Testing...");
}

// Notes:
// - 
`,
  typescript: `// Interviewer Notes & Code Snippets

// Quick test:
function test(): void {
  console.log("Testing...");
}

// Notes:
// - 
`,
  python: `# Interviewer Notes & Code Snippets

# Quick test:
def test():
    print("Testing...")

# Notes:
# - 
`,
  java: `// Interviewer Notes & Code Snippets

public class InterviewerNotes {
    // Quick test:
    public static void test() {
        System.out.println("Testing...");
    }
    
    // Notes:
    // - 
}
`,
  cpp: `// Interviewer Notes & Code Snippets

#include <iostream>
using namespace std;

// Quick test:
void test() {
    cout << "Testing..." << endl;
}

// Notes:
// - 
`,
  go: `// Interviewer Notes & Code Snippets

package main

import "fmt"

// Quick test:
func test() {
    fmt.Println("Testing...")
}

// Notes:
// - 
`,
  rust: `// Interviewer Notes & Code Snippets

// Quick test:
fn test() {
    println!("Testing...");
}

// Notes:
// - 
`,
};

export default function ScratchPad({ language = "javascript", roomId }) {
  const [files, setFiles] = useState(() => {
    // Try to load from localStorage first
    const saved = typeof window !== "undefined" 
      ? localStorage.getItem(`scratchpad-${roomId}`) 
      : null;
    
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall back to template if parsing fails
      }
    }
    
    return {
      [`notes.${getExtension(language)}`]: SCRATCH_TEMPLATES[language] || SCRATCH_TEMPLATES.javascript
    };
  });
  
  const [activeFile, setActiveFile] = useState(() => Object.keys(files)[0]);
  const [lastSaved, setLastSaved] = useState(null);
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  function getExtension(lang) {
    const exts = {
      javascript: "js", typescript: "ts", python: "py", 
      java: "java", cpp: "cpp", go: "go", rust: "rs"
    };
    return exts[lang] || "js";
  }

  // Auto-save to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`scratchpad-${roomId}`, JSON.stringify(files));
      setLastSaved(new Date());
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [files, roomId]);

  function handleFileChange(filename, content) {
    setFiles(prev => ({ ...prev, [filename]: content }));
  }

  function handleAddFile() {
    const ext = getExtension(language);
    const baseName = "scratch";
    let counter = 2;
    let newName = `${baseName}.${ext}`;
    
    while (files[newName]) {
      newName = `${baseName}${counter}.${ext}`;
      counter++;
    }
    
    const template = SCRATCH_TEMPLATES[language] || SCRATCH_TEMPLATES.javascript;
    setFiles(prev => ({ ...prev, [newName]: template }));
    setActiveFile(newName);
  }

  function handleDeleteFile(filename) {
    if (Object.keys(files).length <= 1) return;
    
    const newFiles = { ...files };
    delete newFiles[filename];
    
    if (filename === activeFile) {
      setActiveFile(Object.keys(newFiles)[0]);
    }
    
    setFiles(newFiles);
  }

  function handleClearAll() {
    if (!confirm("Clear all scratch pad content? This cannot be undone.")) return;
    
    const template = SCRATCH_TEMPLATES[language] || SCRATCH_TEMPLATES.javascript;
    const newFiles = { [`notes.${getExtension(language)}`]: template };
    setFiles(newFiles);
    setActiveFile(Object.keys(newFiles)[0]);
  }

  const filenames = Object.keys(files);

  return (
    <div className="flex flex-col h-full bg-[#0d0d18]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Interviewer Scratch Pad</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddFile}
              className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
              title="Add new file"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={handleClearAll}
              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
              title="Clear all content"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Private workspace for notes, code snippets, and testing ideas
          {lastSaved && (
            <span className="ml-2 text-emerald-400">
              • Auto-saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>

      {/* File tabs */}
      {filenames.length > 1 && (
        <div className="flex border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
          {filenames.map((filename) => (
            <div
              key={filename}
              className={`group flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-r border-white/[0.04] transition-colors flex-shrink-0 ${
                filename === activeFile
                  ? "bg-[#0d0d18] text-slate-200 border-t-2 border-t-cyan-500"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border-t-2 border-t-transparent cursor-pointer"
              }`}
              onClick={() => setActiveFile(filename)}
            >
              <span className="text-cyan-400 text-[10px]">●</span>
              <span>{filename}</span>
              {filenames.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(filename);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity ml-0.5 leading-none"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={files[activeFile] || ""}
          onChange={(value) => handleFileChange(activeFile, value || "")}
          onMount={(editor) => { editorRef.current = editor; }}
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
            // Make it feel more like a notepad
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "always",
          }}
        />
      </div>
    </div>
  );
}