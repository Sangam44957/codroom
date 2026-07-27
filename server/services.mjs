// Simplified service functions for socket server to avoid path alias dependencies
import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.mjs";

const prisma = new PrismaClient();

export async function getRoomOwnerData(roomId) {
  try {
    return await prisma.room.findUnique({
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
  } catch (err) {
    logger.error({ err: err.message, roomId }, "[services] getRoomOwnerData error");
    return null;
  }
}

export async function getMessages(roomId, limit = 200) {
  try {
    return await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { timestamp: "asc" },
      take: Math.min(limit, 200),
    });
  } catch (err) {
    logger.error({ err: err.message, roomId }, "[services] getMessages error");
    return [];
  }
}

export async function persistMessage(roomId, { id, sender, role, text, timestamp }) {
  try {
    return await prisma.chatMessage.create({
      data: {
        id,
        roomId,
        sender,
        role: role || "candidate",
        text: text.trim().slice(0, 2000),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });
  } catch (err) {
    logger.error({ err: err.message, roomId }, "[services] persistMessage error");
    return null;
  }
}

export async function updateRoom(roomId, data) {
  try {
    return await prisma.room.update({
      where: { id: roomId },
      data,
    });
  } catch (err) {
    logger.error({ err: err.message, roomId }, "[services] updateRoom error");
    return null;
  }
}

export async function saveSnapshot(interviewId, code) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) return;
    if (interview.status !== "in_progress" && interview.status !== "completed") return;
    await prisma.codeSnapshot.create({ data: { interviewId, code: code || "" } });
    logger.info({ interviewId }, "[services] snapshot saved");
  } catch (err) {
    logger.error({ err: err.message, interviewId }, "[services] saveSnapshot error");
  }
}

export async function saveEvent(interviewId, { type, label }) {
  try {
    await prisma.interviewEvent.create({ data: { interviewId, type, label } });
  } catch (err) {
    logger.error({ err: err.message, interviewId }, "[services] saveEvent error");
  }
}