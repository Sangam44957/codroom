import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { checkCsrf } from "@/lib/csrf";
import { login } from "@/services/auth.service";
import { audit, AuditActions } from "@/lib/audit";

export async function POST(request) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = await rateLimit("login", ip, { limit: 10, windowMs: 15 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await login(email, password);
    if (result.error) {
      return NextResponse.json(
        { error: result.error, ...(result.needsVerification && { needsVerification: true }) },
        { status: result.status }
      );
    }

    audit({
      actorId: result.user?.id,
      actorEmail: email,
      actorRole: "interviewer",
      action: AuditActions.USER_LOGGED_IN,
      resource: "user",
      resourceId: result.user?.id || email,
      request,
    });

    return NextResponse.json(
      { message: "Login successful", user: result.user },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
