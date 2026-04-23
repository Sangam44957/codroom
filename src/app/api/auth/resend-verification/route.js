import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = await rateLimit("resend-verification", ip, { limit: 3, windowMs: 15 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { email } = await request.json().catch(() => ({}));
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (user && !user.emailVerified) {
    const otp = String(randomInt(100000, 999999));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const otpHash = await bcrypt.hash(otp, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyOtp: otpHash, verifyOtpExpiry: otpExpiry },
    });
    await sendVerificationEmail(user.email, otp).catch((err) =>
      console.error("[resend-verification] email error:", err.message)
    );
  }

  return NextResponse.json(
    { message: "A new verification code has been sent to your email." },
    { status: 200 }
  );
}
