import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { updateExistingTemplate, removeTemplate } from "@/services/template.service";

export const PATCH = withAuthz(async (request, { params }) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  const { templateId } = await params;
  const body = await request.json();
  const result = await updateExistingTemplate(templateId, body, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ template: result.template }, { status: 200 });
});

export const DELETE = withAuthz(async (request, { params }) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  const { templateId } = await params;
  const result = await removeTemplate(templateId, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { status: 200 });
});
