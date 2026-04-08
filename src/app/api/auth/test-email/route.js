import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email";

// DEV ONLY — remove or protect this in production
export async function GET(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const to = new URL(request.url).searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Pass ?to=your@email.com" }, { status: 400 });
  }

  try {
    const result = await sendVerificationEmail(to, "test-token-123");
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
