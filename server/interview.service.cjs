const prisma = require("./db.cjs");

async function saveSnapshot(interviewId, code) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) return;
    // Allow saving during in_progress and briefly after completion (final snapshot)
    if (interview.status !== "in_progress" && interview.status !== "completed") return;
    await prisma.codeSnapshot.create({ data: { interviewId, code: code || "" } });
    console.log(`📸 Snapshot saved for interview ${interviewId}`);
  } catch (err) {
    console.error("[snapshot] error:", err.message);
  }
}

async function saveEvent(interviewId, type, label) {
  try {
    await prisma.interviewEvent.create({ data: { interviewId, type, label } });
  } catch (err) {
    console.error("[event] error:", err.message);
  }
}

module.exports = { saveSnapshot, saveEvent };
