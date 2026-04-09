const prisma = require("./db");

async function getRoomOwnerData(roomId) {
  return prisma.room.findUnique({
    where: { id: roomId },
    select: {
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
    },
  });
}

async function getMessages(roomId, limit = 200) {
  return prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { timestamp: "asc" },
    take: Math.min(limit, 200),
  });
}

async function persistMessage(roomId, { id, sender, role, text, timestamp }) {
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

module.exports = { getRoomOwnerData, getMessages, persistMessage };
