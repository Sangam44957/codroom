import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
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
    const { name, email, password } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: "Name must be 2–80 characters" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: "Password must be 6–128 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashed },
    });

    const token = await createToken({ userId: user.id, email: user.email, name: user.name });
    await setAuthCookie(token);

    return NextResponse.json(
      { message: "Account created successfully", user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
