import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { forgotPassword } from "@/services/auth.service";

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rl = await rateLimit("forgot-password", ip, { limit: 3, windowMs: 15 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const { email } = await request.json().catch(() => ({}));
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await forgotPassword(email);
    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch (err) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
