import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import prisma from "@/lib/db";

export const GET = withAuthz(async (request) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);

  const page     = Math.max(1, parseInt(searchParams.get("page")  || "1", 10));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
  const action   = searchParams.get("action");
  const resource = searchParams.get("resource");
  const resourceId = searchParams.get("resourceId");
  const since    = searchParams.get("since");

  const where = { actorId: user.userId };
  if (action)     where.action     = action;
  if (resource)   where.resource   = resource;
  if (resourceId) where.resourceId = resourceId;
  if (since)      where.createdAt  = { gte: new Date(since) };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, action: true, resource: true, resourceId: true,
        actorRole: true, metadata: true, ipAddress: true, createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
