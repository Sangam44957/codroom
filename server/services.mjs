// Simplified service functions for socket server to avoid path alias dependencies
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getRoomOwnerData(roomId) {
  return prisma.room.findUnique({
    where: { id: roomId },
    select: {
      createdById: true,
      language: true,
      status: true,
      candidateName: true,
      interview: {
        select: {
          id: true,
          status: true,
          snapshots: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: { code: true },
          },
        },
      },
    },
  });
}

export async function getMessages(roomId, limit = 200) {
  return prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { timestamp: "asc" },
    take: Math.min(limit, 200),
  });
}

export async function persistMessage(roomId, { id, sender, role, text, timestamp }) {
  return prisma.chatMessage.create({
    data: {
      id,
      roomId,
      sender,
      role: role || "candidate",
      text: text.trim().slice(0, 2000),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    },
  });
}

export async function updateRoom(roomId, data) {
  return prisma.room.update({
    where: { id: roomId },
    data,
  });
}

export async function saveSnapshot(interviewId, code) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) return;
    if (interview.status !== "in_progress" && interview.status !== "completed") return;
    await prisma.codeSnapshot.create({ data: { interviewId, code: code || "" } });
    console.log(`📸 Snapshot saved for interview ${interviewId}`);
  } catch (err) {
    console.error("[snapshot] error:", err.message);
  }
}

export async function saveEvent(interviewId, { type, label }) {
  try {
    await prisma.interviewEvent.create({ data: { interviewId, type, label } });
  } catch (err) {
    console.error("[event] error:", err.message);
  }
}