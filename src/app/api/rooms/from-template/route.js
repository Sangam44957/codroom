import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { getTemplateForRoom } from "@/services/template.service";
import { createNewRoom } from "@/services/room.service";
import prisma from "@/lib/db";

export const POST = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  const body = await request.json().catch(() => ({}));
  const { templateId, candidateName, title } = body;

  if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 });

  const result = await getTemplateForRoom(templateId, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  const { template } = result;
  const roomTitle = title?.trim() || `${template.name}${candidateName ? ` — ${candidateName}` : ""}`;

  const room = await createNewRoom(
    {
      title: roomTitle,
      candidateName: candidateName?.trim() || null,
      language: template.language,
      problemIds: template.problemIds,
    },
    user.userId
  );

  // Link the template and increment its usage counter
  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { templateId } }),
    prisma.interviewTemplate.update({ where: { id: templateId }, data: { usageCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ room: { ...room, templateId } }, { status: 201 });
});
