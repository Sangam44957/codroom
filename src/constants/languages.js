export const LANGUAGES = {
  javascript: {
    id: "javascript",
    label: "JavaScript",
    ext: "js",
    dockerImage: "node:20-alpine",
    dockerCmd: (filename) => ["node", filename],
    defaultCode: `// Welcome to CodRoom\n\nfunction solution() {\n  \n}\n`
  },
  typescript: {
    id: "typescript",
    label: "TypeScript",
    ext: "ts",
    dockerImage: "codroom-ts",
    dockerCmd: (filename) => ["tsx", filename],
    defaultCode: `// Welcome to CodRoom\n\nfunction solution(): void {\n  \n}\n`
  },
  python: {
    id: "python",
    label: "Python",
    ext: "py",
    dockerImage: "python:3.12-alpine",
    dockerCmd: (filename) => ["python", filename],
    defaultCode: `# Welcome to CodRoom\n\ndef solution():\n    pass\n`
  },
  java: {
    id: "java",
    label: "Java",
    ext: "java",
    dockerImage: "eclipse-temurin:21-alpine",
    dockerCmd: (filename) => ["sh", "-c", `javac ${filename} && java ${filename.replace('.java', '')}`],
    defaultCode: `// Welcome to CodRoom\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`
  },
  cpp: {
    id: "cpp",
    label: "C++",
    ext: "cpp",
    dockerImage: "alpine:latest",
    dockerCmd: (filename) => ["sh", "-c", `apk add --no-cache g++ && g++ -o /tmp/a.out ${filename} && /tmp/a.out`],
    defaultCode: `// Welcome to CodRoom\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n`
  },
  c: {
    id: "c",
    label: "C",
    ext: "c",
    dockerImage: "alpine:latest",
    dockerCmd: (filename) => ["sh", "-c", `apk add --no-cache gcc musl-dev && gcc -o /tmp/a.out ${filename} && /tmp/a.out`],
    defaultCode: `// Welcome to CodRoom\n\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n`
  },
  go: {
    id: "go",
    label: "Go",
    ext: "go",
    dockerImage: "golang:1.22-alpine",
    dockerCmd: (filename) => ["go", "run", filename],
    defaultCode: `// Welcome to CodRoom\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n`
  },
  rust: {
    id: "rust",
    label: "Rust",
    ext: "rs",
    dockerImage: "rust:1.77-alpine",
    dockerCmd: (filename) => ["sh", "-c", `rustc ${filename} -o /tmp/a.out && /tmp/a.out`],
    defaultCode: `// Welcome to CodRoom\n\nfn main() {\n    \n}\n`
  }
};

export const LANGUAGE_CONFIG = Object.fromEntries(
  Object.values(LANGUAGES).map(lang => [lang.id, lang])
);

export const LANGUAGE_LIST = Object.values(LANGUAGES).map(({ id, label }) => ({
  id,
  label,
}));

export const LANG_COLORS = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  java: "#b07219", cpp: "#f34b7d", csharp: "#178600",
  go: "#00ADD8", rust: "#dea584",
};