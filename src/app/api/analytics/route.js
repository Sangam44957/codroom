import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import prisma from "@/lib/db";

function round1(val) {
  return val != null ? Math.round(val * 10) / 10 : null;
}

export const GET = withAuthz(async (request) => {
  const user = await requireAuth();
  const userId = user.userId;

  const { searchParams } = new URL(request.url);
  const days  = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 365);
  const since = new Date(Date.now() - days * 86_400_000);

  const roomFilter   = { createdById: userId, createdAt: { gte: since } };
  const reportFilter = { interview: { room: { createdById: userId } }, createdAt: { gte: since } };

  const [
    totalRooms,
    completedInterviews,
    reportsGenerated,
    recentInterviews,
    recommendationBreakdown,
    avgScores,
    languageDistribution,
    difficultyRows,
  ] = await Promise.all([
    // Rooms created in period
    prisma.room.count({ where: roomFilter }),

    // Completed / evaluated interviews in period
    prisma.interview.count({
      where: {
        room: { createdById: userId },
        status: { in: ["completed", "evaluated"] },
        startedAt: { gte: since },
      },
    }),

    // AI reports generated in period
    prisma.aIReport.count({ where: reportFilter }),

    // 10 most recent interviews with room + report
    prisma.interview.findMany({
      where: { room: { createdById: userId }, startedAt: { gte: since } },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        room: { select: { title: true, language: true, candidateName: true } },
        report: {
          select: {
            recommendation: true,
            overallScore: true,
            correctness: true,
            codeQuality: true,
            edgeCaseHandling: true,
          },
        },
      },
    }),

    // Recommendation distribution
    prisma.aIReport.groupBy({
      by: ["recommendation"],
      where: reportFilter,
      _count: { _all: true },
    }),

    // Average AI scores
    prisma.aIReport.aggregate({
      where: reportFilter,
      _avg: {
        overallScore: true,
        correctness: true,
        codeQuality: true,
        edgeCaseHandling: true,
      },
    }),

    // Language distribution across rooms
    prisma.room.groupBy({
      by: ["language"],
      where: roomFilter,
      _count: { _all: true },
      orderBy: { _count: { language: "desc" } },
    }),

    // Problem difficulty distribution via raw SQL (correct table names)
    prisma.$queryRaw`
      SELECT p.difficulty, COUNT(*)::int AS count
      FROM room_problems rp
      JOIN problems p ON rp."problemId" = p.id
      JOIN rooms r    ON rp."roomId"    = r.id
      WHERE r."createdById" = ${userId}
        AND r."createdAt"   >= ${since}
      GROUP BY p.difficulty
      ORDER BY count DESC
    `,
  ]);

  const response = NextResponse.json({
    period: { days, since: since.toISOString() },
    overview: {
      totalRooms,
      completedInterviews,
      reportsGenerated,
      completionRate: totalRooms > 0
        ? Math.round((completedInterviews / totalRooms) * 100)
        : 0,
    },
    averageScores: {
      overall:         round1(avgScores._avg.overallScore),
      correctness:     round1(avgScores._avg.correctness),
      codeQuality:     round1(avgScores._avg.codeQuality),
      edgeCaseHandling: round1(avgScores._avg.edgeCaseHandling),
    },
    distributions: {
      recommendations: Object.fromEntries(
        recommendationBreakdown.map((r) => [r.recommendation, r._count._all])
      ),
      languages: Object.fromEntries(
        languageDistribution.map((l) => [l.language, l._count._all])
      ),
      difficulties: Object.fromEntries(
        difficultyRows.map((d) => [d.difficulty, d.count])
      ),
    },
    recentInterviews: recentInterviews.map((iv) => ({
      id:             iv.id,
      roomTitle:      iv.room.title,
      candidateName:  iv.room.candidateName,
      language:       iv.room.language,
      status:         iv.status,
      duration:       iv.duration,
      startedAt:      iv.startedAt,
      recommendation: iv.report?.recommendation ?? null,
      overallScore:   iv.report?.overallScore    ?? null,
    })),
  });

  response.headers.set('Cache-Control', 'private, max-age=30');
  return response;
});
