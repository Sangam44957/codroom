import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  if(!user) { console.log('No user'); return; }

  const template = await prisma.interviewTemplate.findFirst({where: {ownerId: user.id}});
  if(!template) { console.log('No template attached'); return; }

  try {
     const roomTitle = "test";
     
     const room = await prisma.room.create({
      data: {
        title: roomTitle,
        candidateName: null,
        language: template.language,
        createdById: user.id,
        templateId: template.id,
     }
    });

    console.log("Room created", room.id);

    await prisma.$transaction([
      prisma.room.update({ where: { id: room.id }, data: { templateId: template.id } }),
      prisma.interviewTemplate.update({ where: { id: template.id }, data: { usageCount: { increment: 1 } } }),
    ]);
    console.log("Success");
  } catch(e) {
    console.error("ERROR::", e);
  }
}
test().finally(() => process.exit(0));
