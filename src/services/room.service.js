import {
  findRoomById,
  findRoomByIdSelect,
  findRoomsByUser,
  createRoom,
  updateRoom,
  deleteRoomCascade,
  findMessagesByRoom,
  createMessage,
} from "@/repositories/room.repository";
import { findInterviewByRoomId, createInterview } from "@/repositories/interview.repository";
import { incrementUsageCount } from "@/repositories/problem.repository";
import { assertEnum, ROOM_STATUS } from "@/lib/enums";

const PAGE_LIMIT = 12;

export async function getRoomById(id) {
  return findRoomById(id);
}

export async function getRoomOwnerData(roomId) {
  return findRoomByIdSelect(roomId, {
    createdById: true,
    language: true,
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
  });
}

export async function listRooms(userId, page) {
  const skip = (Math.max(1, page) - 1) * PAGE_LIMIT;
  const [rooms, total] = await findRoomsByUser(userId, { skip, take: PAGE_LIMIT });
  return { rooms, total, page, totalPages: Math.ceil(total / PAGE_LIMIT) };
}

export async function createNewRoom({ title, candidateName, language, problemId, problemIds, pipelineId }, userId) {
  const ids = problemIds?.length ? problemIds : problemId ? [problemId] : [];
  const room = await createRoom({
    title: title.trim(),
    candidateName: candidateName?.trim() || null,
    language: language || "javascript",
    createdById: userId,
    problemId: ids[0] || null,
    pipelineId: pipelineId || null,
    problems: ids.length
      ? { create: ids.map((pid, i) => ({ problemId: pid, order: i })) }
      : undefined,
  });
  if (ids.length) {
    await Promise.all(ids.map((id) => incrementUsageCount(id).catch(() => {})));
  }
  return room;
}

export async function deleteRoom(roomId, userId) {
  const room = await findRoomByIdSelect(roomId, {
    createdById: true,
    interview: { select: { id: true } },
  });
  if (!room) return { error: "Room not found", status: 404 };
  if (room.createdById !== userId) return { error: "Access denied", status: 403 };
  await deleteRoomCascade(roomId, room.interview?.id || null);
  return { success: true };
}

export async function validateJoinToken(roomId, joinToken) {
  const room = await findRoomByIdSelect(roomId, {
    id: true,
    joinToken: true,
    candidateName: true,
  });
  if (!room || room.joinToken !== joinToken) return null;
  return room;
}

export async function getMessages(roomId, limit) {
  return findMessagesByRoom(roomId, Math.min(limit, 200));
}

export async function persistMessage(roomId, { id, sender, role, text, timestamp }) {
  return createMessage({
    id,
    roomId,
    sender,
    role: role || "candidate",
    text: text.trim().slice(0, 2000),
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  });
}

export async function getOrCreateInterviewForNotes(roomId) {
  let interview = await findInterviewByRoomId(roomId);
  if (!interview) {
    interview = await createInterview({ roomId, language: "javascript" });
  }
  return interview;
}

export async function updateRoomStatus(roomId, status) {
  assertEnum(status, ROOM_STATUS, "room status");
  return updateRoom(roomId, { status });
}
