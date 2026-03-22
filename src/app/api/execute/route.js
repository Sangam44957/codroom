import { NextResponse } from "next/server";
import { submitCode, parseResult } from "@/lib/judge0";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const MAX_CODE_BYTES = 64 * 1024; // 64 KB

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await rateLimit("execute", user.userId, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const { code, language, stdin } = await request.json();

    if (!code?.trim() || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
    }

    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return NextResponse.json({ error: "Code exceeds maximum size (64 KB)" }, { status: 413 });
    }

    const result = await submitCode(code, language, stdin || "");
    const parsed = parseResult(result);

    return NextResponse.json(parsed, {
      status: 200,
      headers: { "X-RateLimit-Remaining": String(rl.remaining) },
    });
  } catch (error) {
    console.error("[execute] Error:", error.message);
    return NextResponse.json({ error: "Code execution failed." }, { status: 500 });
  }
}
