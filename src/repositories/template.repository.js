import prisma from "@/lib/db";

const TEMPLATE_SELECT = {
  id: true, name: true, description: true, language: true,
  durationMinutes: true, problemIds: true, focusModeEnabled: true,
  rubricWeights: true, customPrompt: true, defaultPipelineId: true,
  usageCount: true, createdAt: true, updatedAt: true, ownerId: true,
};

export async function findTemplatesByOwner(ownerId) {
  return prisma.interviewTemplate.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    select: TEMPLATE_SELECT,
  });
}

export async function findTemplateById(id) {
  return prisma.interviewTemplate.findUnique({ where: { id }, select: TEMPLATE_SELECT });
}

export async function createTemplate(data) {
  return prisma.interviewTemplate.create({ data, select: TEMPLATE_SELECT });
}

export async function updateTemplate(id, data) {
  return prisma.interviewTemplate.update({ where: { id }, data, select: TEMPLATE_SELECT });
}

export async function deleteTemplate(id) {
  return prisma.interviewTemplate.delete({ where: { id } });
}
