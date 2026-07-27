import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const MAX_CODE_BYTES = 64 * 1024; // 64 KB

// In production, proxy to EC2 socket server which has Docker
// In dev, execute locally
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export async function POST(request) {
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0].trim() 
    || request.headers.get("x-real-ip") 
    || "anonymous";
  
  const rl = await rateLimit("execute", clientIP, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "20",
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

    // Proxy to the EC2 socket server which has Docker
    const execUrl = `${SOCKET_SERVER_URL}/execute`;
    const proxyRes = await fetch(execUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, stdin: stdin || "" }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    const result = await proxyRes.json();

    return NextResponse.json(result, {
      status: proxyRes.status,
      headers: { "X-RateLimit-Remaining": String(rl.remaining) },
    });
  } catch (error) {
    logger.error({ error: error.message }, "Code execution proxy failed");
    return NextResponse.json(
      { error: "Code execution failed.", stderr: error.message, dockerAvailable: false },
      { status: 500 }
    );
  }
}