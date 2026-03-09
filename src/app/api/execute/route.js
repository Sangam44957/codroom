import { NextResponse } from "next/server";
import { submitCode, parseResult } from "@/lib/judge0";

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, language, stdin } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 }
      );
    }

    const result = await submitCode(code, language, stdin || "");
    
    // Log what Piston actually returned
    console.log("Piston result:", JSON.stringify(result));
    
    const parsed = parseResult(result);
    return NextResponse.json(parsed, { status: 200 });

  } catch (error) {
    // Log the REAL error
    console.error("FULL execution error:", error.message);
    return NextResponse.json(
      { error: error.message || "Code execution failed." },
      { status: 500 }
    );
  }
}