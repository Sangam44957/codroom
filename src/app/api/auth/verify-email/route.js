import { NextResponse } from "next/server";
import { verifyEmail } from "@/services/auth.service";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.email?.trim() || !body.otp?.trim()) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }
  const result = await verifyEmail(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ message: result.message }, { status: 200 });
}
