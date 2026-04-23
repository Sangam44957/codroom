/**
 * Single source of truth for all language configuration.
 * Used by: Monaco editor, Docker sandbox, room creation UI, run-tests API.
 */

export const LANGUAGES = {
  javascript: {
    id:            "javascript",
    label:         "JavaScript",
    monacoId:      "javascript",
    ext:           "js",
    dockerImage:   "node:20-alpine",
    dockerCmd:     (f) => `node /sandbox/${f}`,
    starterTemplate: "function solution(input) {\n  // your code here\n}\n",
  },
  typescript: {
    id:            "typescript",
    label:         "TypeScript",
    monacoId:      "typescript",
    ext:           "ts",
    dockerImage:   "codroom-ts",
    dockerCmd:     (f) => `tsx /sandbox/${f}`,
    starterTemplate: "function solution(input: unknown): unknown {\n  // your code here\n}\n",
  },
  python: {
    id:            "python",
    label:         "Python",
    monacoId:      "python",
    ext:           "py",
    dockerImage:   "python:3.12-alpine",
    dockerCmd:     (f) => `python /sandbox/${f}`,
    starterTemplate: "def solution(input):\n    # your code here\n    pass\n",
  },
  java: {
    id:            "java",
    label:         "Java",
    monacoId:      "java",
    ext:           "java",
    dockerImage:   "openjdk:21-slim",
    dockerCmd:     (f) => `sh -c "javac -d /tmp /sandbox/${f} && java -cp /tmp Main"`,
    starterTemplate: "class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}\n",
  },
  cpp: {
    id:            "cpp",
    label:         "C++",
    monacoId:      "cpp",
    ext:           "cpp",
    dockerImage:   "gcc:13",
    dockerCmd:     (f) => `sh -c "g++ -o /tmp/out /sandbox/${f} && /tmp/out"`,
    starterTemplate: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}\n",
  },
  c: {
    id:            "c",
    label:         "C",
    monacoId:      "c",
    ext:           "c",
    dockerImage:   "gcc:13",
    dockerCmd:     (f) => `sh -c "gcc -o /tmp/out /sandbox/${f} && /tmp/out"`,
    starterTemplate: "#include <stdio.h>\n\nint main() {\n    // your code here\n    return 0;\n}\n",
  },
  go: {
    id:            "go",
    label:         "Go",
    monacoId:      "go",
    ext:           "go",
    dockerImage:   "golang:1.22-alpine",
    dockerCmd:     (f) => `go run /sandbox/${f}`,
    starterTemplate: "package main\n\nfunc main() {\n\t// your code here\n}\n",
  },
  rust: {
    id:            "rust",
    label:         "Rust",
    monacoId:      "rust",
    ext:           "rs",
    dockerImage:   "rust:1.77-alpine",
    dockerCmd:     (f) => `sh -c "rustc -o /tmp/out /sandbox/${f} && /tmp/out"`,
    starterTemplate: "fn main() {\n    // your code here\n}\n",
  },
};

/** Ordered list for UI dropdowns */
export const LANGUAGE_LIST = [
  LANGUAGES.javascript,
  LANGUAGES.typescript,
  LANGUAGES.python,
  LANGUAGES.java,
  LANGUAGES.cpp,
  LANGUAGES.c,
  LANGUAGES.go,
  LANGUAGES.rust,
];

/** IDs accepted by the execute and run-tests APIs */
export const SUPPORTED_LANGUAGE_IDS = LANGUAGE_LIST.map((l) => l.id);
