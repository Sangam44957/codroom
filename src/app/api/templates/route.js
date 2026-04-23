import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { listTemplates, createNewTemplate } from "@/services/template.service";

export const GET = withAuthz(async () => {
  const user = await requireAuth();
  const templates = await listTemplates(user.userId);
  return NextResponse.json({ templates }, { status: 200 });
});

export const POST = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  const body = await request.json();
  const result = await createNewTemplate(body, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ template: result.template }, { status: 201 });
});
