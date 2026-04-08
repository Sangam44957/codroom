import { NextResponse } from "next/server";
import { randomBytes, randomInt } from "crypto";
import prisma from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { checkCsrf } from "@/lib/csrf";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be 8–128 characters" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const otp = String(randomInt(100000, 999999));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // If no email provider is configured, auto-verify so the app works in dev
    const emailConfigured = !!process.env.BREVO_API_KEY;

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        verifyOtp:       emailConfigured ? otp      : null,
        verifyOtpExpiry: emailConfigured ? otpExpiry : null,
        emailVerified: !emailConfigured,
      },
    });

    if (emailConfigured) {
      sendVerificationEmail(user.email, otp).catch((err) =>
        console.error("[register] email error:", err.message)
      );
      return NextResponse.json(
        { message: "Account created. Enter the 6-digit code sent to your email.", needsVerification: true, email: user.email },
        { status: 201, headers: { "Cache-Control": "no-store" } }
      );
    }

    // No email provider — auto-verified, set auth cookie and log in immediately
    const token = await createToken({ userId: user.id, email: user.email, name: user.name });
    await setAuthCookie(token);
    return NextResponse.json(
      { message: "Account created.", user: { id: user.id, name: user.name, email: user.email } },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[register] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
