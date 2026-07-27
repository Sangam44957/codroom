import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const lintJsonPath = path.join(repoRoot, "lint-findings.json");
const outputRoot = path.join(repoRoot, "review-reports");
const fileReportsDir = path.join(outputRoot, "files");

if (!fs.existsSync(lintJsonPath)) {
  console.error("lint-findings.json not found. Run ESLint JSON export first.");
  process.exit(1);
}

const lintResults = JSON.parse(fs.readFileSync(lintJsonPath, "utf8"));
const filesWithIssues = lintResults.filter(
  (entry) => Array.isArray(entry.messages) && entry.messages.length > 0,
);

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(fileReportsDir, { recursive: true });

const normalizePath = (value) => value.replace(/\\/g, "/");
const toRelative = (absPath) => normalizePath(path.relative(repoRoot, absPath));
const toSafeFilename = (relativePath) =>
  `${relativePath.replace(/[\\/:]/g, "__").replace(/[^a-zA-Z0-9._-]/g, "_")}.md`;
const severityLabel = (severity) => (severity === 2 ? "Error" : "Warning");

let totalIssues = 0;
const indexLines = [
  "# Lint Review Reports",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Scanned files: ${lintResults.length}`,
  `Files with issues: ${filesWithIssues.length}`,
];

if (filesWithIssues.length === 0) {
  indexLines.push("Total issues: 0");
  indexLines.push("");
  indexLines.push("No ESLint issues were detected.");
} else {
  for (const entry of filesWithIssues) {
    const relativeFilePath = toRelative(entry.filePath);
    const outputFileName = toSafeFilename(relativeFilePath);
    const outputPath = path.join(fileReportsDir, outputFileName);
    const errors = entry.messages.filter((msg) => msg.severity === 2).length;
    const warnings = entry.messages.filter((msg) => msg.severity === 1).length;

    totalIssues += entry.messages.length;

    const reportLines = [
      `# File Review: ${relativeFilePath}`,
      "",
      `Total issues: ${entry.messages.length}`,
      `Errors: ${errors}`,
      `Warnings: ${warnings}`,
      "",
      "## Findings",
      "",
    ];

    for (const message of entry.messages) {
      const line = message.line ?? 0;
      const column = message.column ?? 0;
      const rule = message.ruleId ?? "unknown-rule";
      reportLines.push(
        `- [${severityLabel(message.severity)}] Line ${line}, Column ${column}, Rule ${rule}: ${message.message}`,
      );
    }

    fs.writeFileSync(outputPath, `${reportLines.join("\n")}\n`, "utf8");

    indexLines.push(
      `- [${relativeFilePath}](files/${outputFileName}) - ${entry.messages.length} issue(s), ${errors} error(s), ${warnings} warning(s)`,
    );
  }

  indexLines.splice(5, 0, `Total issues: ${totalIssues}`);
}

fs.writeFileSync(path.join(outputRoot, "INDEX.md"), `${indexLines.join("\n")}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      scannedFiles: lintResults.length,
      filesWithIssues: filesWithIssues.length,
      totalIssues,
      outputDirectory: normalizePath(path.relative(repoRoot, outputRoot)),
    },
    null,
    2,
  ),
);