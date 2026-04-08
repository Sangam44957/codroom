import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request) {
  const { email, otp } = await request.json().catch(() => ({}));

  if (!email?.trim() || !otp?.trim()) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  if (!user.verifyOtp || !user.verifyOtpExpiry) {
    return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
  }

  if (new Date() > user.verifyOtpExpiry) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  if (user.verifyOtp !== otp.trim()) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyOtp: null, verifyOtpExpiry: null },
  });

  return NextResponse.json({ message: "Email verified! You can now sign in." }, { status: 200 });
}
