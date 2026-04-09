import prisma from "@/lib/db";

export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data) {
  return prisma.user.create({ data });
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

export async function findUserByVerifyToken(token) {
  return prisma.user.findUnique({ where: { verifyToken: token } });
}

export async function findUserByResetToken(token) {
  return prisma.user.findUnique({ where: { resetToken: token } });
}
