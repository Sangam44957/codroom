import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request) {
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
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createToken({ userId: user.id, email: user.email, name: user.name });
    await setAuthCookie(token);

    return NextResponse.json(
      { message: "Login successful", user: { id: user.id, name: user.name, email: user.email } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
