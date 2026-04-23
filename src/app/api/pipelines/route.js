import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { listPipelines, createNewPipeline } from "@/services/pipeline.service";

export const GET = withAuthz(async () => {
  const user = await requireAuth();
  const pipelines = await listPipelines(user.userId);
  return NextResponse.json({ pipelines });
});

export const POST = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  const body = await request.json();
  if (!body.name?.trim())
    return NextResponse.json({ error: "Pipeline name is required" }, { status: 400 });

  const pipeline = await createNewPipeline(body, user.userId);
  return NextResponse.json({ pipeline }, { status: 201 });
});
