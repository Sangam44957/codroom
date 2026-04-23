import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { getPipeline, updateExistingPipeline, removePipeline } from "@/services/pipeline.service";

export const GET = withAuthz(async (_req, { params }) => {
  const { pipelineId } = await params;
  const user = await requireAuth();
  const pipeline = await getPipeline(pipelineId, user.userId);
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ pipeline });
});

export const PATCH = withAuthz(async (request, { params }) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const { pipelineId } = await params;
  const user = await requireAuth();
  const body = await request.json();
  const pipeline = await updateExistingPipeline(pipelineId, user.userId, body);
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ pipeline });
});

export const DELETE = withAuthz(async (request, { params }) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const { pipelineId } = await params;
  const user = await requireAuth();
  const ok = await removePipeline(pipelineId, user.userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
});
