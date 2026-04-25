export const LANGUAGE_CONFIG = {
  javascript: { label: "JavaScript", ext: "js",   defaultCode: `// Welcome to CodRoom\n\nfunction solution() {\n  \n}\n` },
  typescript: { label: "TypeScript", ext: "ts",   defaultCode: `// Welcome to CodRoom\n\nfunction solution(): void {\n  \n}\n` },
  python:     { label: "Python",     ext: "py",   defaultCode: `# Welcome to CodRoom\n\ndef solution():\n    pass\n` },
  java:       { label: "Java",       ext: "java", defaultCode: `// Welcome to CodRoom\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n` },
  cpp:        { label: "C++",        ext: "cpp",  defaultCode: `// Welcome to CodRoom\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n` },
  csharp:     { label: "C#",         ext: "cs",   defaultCode: `// Welcome to CodRoom\n\nusing System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}\n` },
  go:         { label: "Go",         ext: "go",   defaultCode: `// Welcome to CodRoom\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n` },
  rust:       { label: "Rust",       ext: "rs",   defaultCode: `// Welcome to CodRoom\n\nfn main() {\n    \n}\n` },
};

export const LANGUAGES = Object.entries(LANGUAGE_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}));

export const LANGUAGE_LIST = LANGUAGES.map(({ value, label }) => ({
  id: value,
  label,
}));

export const LANG_COLORS = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  java: "#b07219", cpp: "#f34b7d", csharp: "#178600",
  go: "#00ADD8", rust: "#dea584",
};