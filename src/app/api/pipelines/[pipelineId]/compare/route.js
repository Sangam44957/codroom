import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { getPipelineComparison } from "@/services/pipeline.service";
import { logger } from "@/lib/logger";

export const GET = withAuthz(async (_req, { params }) => {
  const { pipelineId } = await params;
  const user = await requireAuth();
  const log = logger.child({ pipelineId, userId: user.userId });

  const data = await getPipelineComparison(pipelineId, user.userId);
  if (!data) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

  log.info({ candidateCount: data.candidates.length }, "Pipeline comparison generated");
  return NextResponse.json(data);
});
