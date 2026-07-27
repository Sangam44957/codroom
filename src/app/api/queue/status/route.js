import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobQueue";

export async function GET() {
  try {
    await jobQueue.connect();
    
    const stats = await Promise.all([
      jobQueue.getQueueStats('ai-reports')
    ]);
    
    return NextResponse.json({
      queues: {
        'ai-reports': stats[0]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get queue stats" },
      { status: 500 }
    );
  }
}