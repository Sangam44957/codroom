import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import prisma from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

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

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user) {
      const otp = String(randomInt(100000, 999999));
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetOtp: otp, resetOtpExpiry: expiry },
      });
      await sendPasswordResetEmail(user.email, otp).catch((err) =>
        console.error("[forgot-password] email error:", err.message)
      );
    }

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (err) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
