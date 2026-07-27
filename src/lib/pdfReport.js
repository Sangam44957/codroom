import { jsPDF } from "jspdf";

/**
 * @param {object} d
 * @param {string} [d.candidateName]
 * @param {string} [d.roomTitle]
 * @param {Date|string} [d.startedAt]
 * @param {number} [d.duration]       seconds
 * @param {string} [d.language]
 * @param {string} [d.recommendation]
 * @param {number} [d.correctness]
 * @param {number} [d.codeQuality]
 * @param {number} [d.edgeCaseHandling]
 * @param {number} [d.overallScore]
 * @param {string} [d.timeComplexity]
 * @param {string} [d.spaceComplexity]
 * @param {string} [d.summary]
 * @param {string} [d.improvements]
 * @param {Array<{title:string,difficulty:string}>} [d.problems]
 * @param {string} [d.finalCode]
 */
export function generateInterviewPDF(d) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 20;
  const cw = W - margin * 2;
  let y = margin;

  const nl = (n = 5) => {
    y += n;
    if (y > 272) { doc.addPage(); y = margin; }
  };

  const hr = () => {
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, y, W - margin, y);
    nl(6);
  };

  const heading = (text, size = 13) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(25, 25, 25);
    doc.text(text, margin, y);
    nl(7);
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(25, 25, 25);
  doc.text("Interview Report", margin, y);
  nl(8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  ·  CodRoom Technical Interview Platform`,
    margin, y
  );
  nl(10);
  hr();

  // ── Candidate details ────────────────────────────────────────────────────────
  heading("Candidate Details");
  const rows = [
    ["Candidate",  d.candidateName || "Anonymous"],
    ["Position",   d.roomTitle     || "—"],
    ["Date",       d.startedAt ? new Date(d.startedAt).toLocaleDateString() : "—"],
    ["Duration",   d.duration  ? `${Math.round(d.duration / 60)} minutes` : "—"],
    ["Language",   d.language  || "—"],
  ];
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");   doc.setTextColor(80, 80, 80);  doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(25, 25, 25);  doc.text(value, margin + 38, y);
    nl(6);
  }
  nl(3); hr();

  // ── Recommendation ───────────────────────────────────────────────────────────
  heading("Recommendation");
  const recColors = {
    strong_hire:  [22, 163, 74],
    hire:         [34, 197, 94],
    lean_hire:    [234, 179, 8],
    lean_no_hire: [249, 115, 22],
    no_hire:      [239, 68, 68],
  };
  const rc = recColors[d.recommendation] || [100, 100, 100];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...rc);
  doc.text((d.recommendation || "pending").replace(/_/g, " ").toUpperCase(), margin, y);
  nl(12);

  // ── Scores ───────────────────────────────────────────────────────────────────
  doc.setTextColor(25, 25, 25);
  heading("Evaluation Scores");
  const scores = [
    { label: "Correctness",        value: d.correctness },
    { label: "Code Quality",       value: d.codeQuality },
    { label: "Edge Case Handling", value: d.edgeCaseHandling },
    { label: "Overall Score",      value: d.overallScore },
  ];
  for (const s of scores) {
    if (s.value == null) continue;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(s.label, margin, y);
    const bx = margin + 52, bw = 75, bh = 4.5;
    doc.setFillColor(225, 225, 225);
    doc.roundedRect(bx, y - 3.5, bw, bh, 1, 1, "F");
    const pct = s.value / 10;
    const fc = pct >= 0.8 ? [22, 163, 74] : pct >= 0.6 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(...fc);
    doc.roundedRect(bx, y - 3.5, bw * pct, bh, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setTextColor(25, 25, 25);
    doc.text(`${s.value}/10`, bx + bw + 4, y);
    nl(9);
  }
  if (d.timeComplexity || d.spaceComplexity) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    if (d.timeComplexity) { doc.text(`Time Complexity:`, margin, y); doc.setFont("helvetica", "bold"); doc.setTextColor(25,25,25); doc.text(d.timeComplexity, margin + 38, y); nl(6); }
    if (d.spaceComplexity) { doc.setFont("helvetica", "normal"); doc.setTextColor(80,80,80); doc.text(`Space Complexity:`, margin, y); doc.setFont("helvetica", "bold"); doc.setTextColor(25,25,25); doc.text(d.spaceComplexity, margin + 38, y); nl(6); }
  }
  nl(2); hr();

  // ── Summary ──────────────────────────────────────────────────────────────────
  if (d.summary) {
    heading("Summary");
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(50, 50, 50);
    for (const line of doc.splitTextToSize(d.summary, cw)) {
      if (y > 272) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); nl(5);
    }
    nl(2); hr();
  }

  // ── Improvements ─────────────────────────────────────────────────────────────
  if (d.improvements) {
    heading("Areas to Improve");
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(50, 50, 50);
    for (const line of doc.splitTextToSize(d.improvements, cw)) {
      if (y > 272) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); nl(5);
    }
    nl(2); hr();
  }

  // ── Problems ─────────────────────────────────────────────────────────────────
  if (d.problems?.length) {
    heading("Problems Attempted");
    const diffColors = { easy: [22,163,74], medium: [234,179,8], hard: [239,68,68] };
    for (const p of d.problems) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(25, 25, 25);
      doc.text(`• ${p.title}`, margin + 2, y);
      if (p.difficulty) {
        const dc = diffColors[p.difficulty.toLowerCase()] || [100, 100, 100];
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...dc);
        doc.text(p.difficulty.toUpperCase(), W - margin - 15, y);
      }
      nl(7);
    }
    nl(2); hr();
  }

  // ── Final code ───────────────────────────────────────────────────────────────
  if (d.finalCode) {
    heading("Final Code");
    const codeLines = d.finalCode.split("\n").slice(0, 60);
    const blockH = Math.min(codeLines.length * 4.5 + 8, 240);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y - 2, cw, blockH, 2, 2, "F");
    doc.setFont("courier", "normal"); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
    for (const line of codeLines) {
      if (y > 270) { doc.addPage(); y = margin; }
      nl(4.5);
      doc.text(line.substring(0, 115), margin + 3, y);
    }
    if (d.finalCode.split("\n").length > 60) {
      nl(6);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
      doc.text("… code truncated for brevity", margin + 3, y);
    }
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(190, 190, 190);
    doc.text(
      `CodRoom Interview Report  ·  Page ${i} of ${pages}  ·  Confidential`,
      W / 2, 290, { align: "center" }
    );
  }

  return doc;
}
