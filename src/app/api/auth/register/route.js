import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { checkCsrf } from "@/lib/csrf";
import { register } from "@/services/auth.service";

export async function POST(request) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = await rateLimit("register", ip, { limit: 5, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = await register(body);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json(
      result.needsVerification
        ? { message: result.message, needsVerification: true, email: result.email }
        : { message: "Account created.", user: result.user },
      { status: result.status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[register] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
