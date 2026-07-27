import { NextResponse } from "next/server";
import { getCurrentUser, createToken } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const token = await createToken({ userId: user.userId, email: user.email });
  return NextResponse.json({ token }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
