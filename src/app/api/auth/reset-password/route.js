import { NextResponse } from "next/server";
import { resetPassword } from "@/services/auth.service";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await resetPassword(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ message: result.message }, { status: 200 });
}
