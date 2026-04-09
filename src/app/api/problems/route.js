import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listProblems, createNewProblem, removeProblem } from "@/services/problem.service";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const problems = await listProblems(
      {
        difficulty: searchParams.get("difficulty"),
        topic: searchParams.get("topic"),
        search: searchParams.get("search"),
      },
      user.userId
    );
    return NextResponse.json({ problems }, { status: 200 });
  } catch (error) {
    console.error("[problems] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = await request.json();
    const result = await createNewProblem(body, user.userId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ problem: result.problem }, { status: 201 });
  } catch (error) {
    console.error("[problems] POST error:", error);
    return NextResponse.json({ error: "Failed to create problem" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const result = await removeProblem(id, user.userId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[problems] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete problem" }, { status: 500 });
  }
}
