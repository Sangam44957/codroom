import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request) {
  const { email, otp, password } = await request.json().catch(() => ({}));

  if (!email?.trim() || !otp?.trim() || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
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

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.resetOtp || !user.resetOtpExpiry) {
    return NextResponse.json({ error: "Invalid or expired code. Please request a new one." }, { status: 400 });
  }

  if (new Date() > user.resetOtpExpiry) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  if (user.resetOtp !== otp.trim()) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  const hashed = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetOtp: null,
      resetOtpExpiry: null,
      resetToken: null,
      resetTokenExpiry: null,
      emailVerified: true,
      verifyOtp: null,
      verifyOtpExpiry: null,
    },
  });

  return NextResponse.json({ message: "Password updated. You can now sign in." }, { status: 200 });
}
