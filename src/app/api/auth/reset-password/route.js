import { NextResponse } from "next/server";
import { resetPassword } from "@/services/auth.service";
import { audit, AuditActions } from "@/lib/audit";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await resetPassword(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  audit({
    actorEmail: body.email || null,
    action: AuditActions.USER_PASSWORD_RESET,
    resource: "user",
    resourceId: body.email || "unknown",
    request,
  });
  return NextResponse.json({ message: result.message }, { status: 200 });
}
