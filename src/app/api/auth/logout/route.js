import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";

export async function POST(request) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  await removeAuthCookie();
  return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
}