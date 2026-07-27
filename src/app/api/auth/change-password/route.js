import { NextResponse } from "next/server";
import { checkCsrf } from "@/lib/csrf";
import { requireAuth } from "@/lib/authz";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { updateUser, findUserById } from "@/repositories/user.repository";
import { audit, AuditActions } from "@/lib/audit";

export async function POST(request) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth(request);
  if (user.error) return NextResponse.json({ error: user.error }, { status: user.status });

  const body = await request.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new passwords required" }, { status: 400 });
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    return NextResponse.json({ error: "Password must be 8–128 characters" }, { status: 400 });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
  }
  if (!/[0-9]/.test(newPassword)) {
    return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
  }

  const dbUser = await findUserById(user.userId);
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isCurrentValid = await verifyPassword(currentPassword, dbUser.password);
  if (!isCurrentValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashedNew = await hashPassword(newPassword);
  await updateUser(user.userId, {
    password: hashedNew,
    jwtIssuedAt: new Date(), // Revoke all existing JWTs
  });

  audit({
    actorId: user.userId,
    actorEmail: user.email,
    action: AuditActions.USER_PASSWORD_CHANGE,
    resource: "user",
    resourceId: user.userId,
    request,
  });

  return NextResponse.json({ message: "Password changed successfully" });
}