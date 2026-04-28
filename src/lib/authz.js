/**
 * Centralized authorization helper.
 * Every API route that touches a room, interview, snapshot, note, or report
 * must go through these helpers. Deny-by-default: if ownership cannot be
 * confirmed, access is rejected.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

// ─── Response helpers ────────────────────────────────────────────────────────

export const UNAUTHORIZED = () =>
  NextResponse.json({ error: "Not authenticated" }, { status: 401 });

export const FORBIDDEN = () =>
  NextResponse.json({ error: "Access denied" }, { status: 403 });

export const NOT_FOUND = (resource = "Resource") =>
  NextResponse.json({ error: `${resource} not found` }, { status: 404 });

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Returns the current user or throws a NextResponse 401.
 * Usage: const user = await requireAuth();
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw UNAUTHORIZED();
  return user;
}

// ─── Room ownership ──────────────────────────────────────────────────────────

/**
 * Fetches a room and verifies the current user owns it.
 * Throws 401/403/404 NextResponse on failure.
 * Returns { user, room } on success.
 */
export async function requireRoomOwner(roomId) {
  const user = await requireAuth();

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      problem: true,
      interview: { include: { report: true } },
    },
  });

  if (!room) throw NOT_FOUND("Room");
  if (room.createdById !== user.userId) throw FORBIDDEN();

  return { user, room };
}

/**
 * Fetches a room for read access.
 * Allows the room owner OR any authenticated user who has a valid session
 * (candidates join rooms they were invited to — they are authenticated via
 * the join flow, not by ownership).
 * For sensitive data (report, notes, snapshots) use requireRoomOwner instead.
 */
export async function requireRoomAccess(roomId) {
  const user = await requireAuth();

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      problem: true,
      interview: { include: { report: true } },
    },
  });

  if (!room) throw NOT_FOUND("Room");

  return { user, room, isOwner: room.createdById === user.userId };
}

// ─── Interview ownership ─────────────────────────────────────────────────────

/**
 * Fetches an interview and verifies the current user owns the parent room.
 * Returns { user, interview } on success.
 */
export async function requireInterviewOwner(interviewId) {
  const user = await requireAuth();

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      room: {
        include: {
          problem: true,
          problems: { include: { problem: true }, orderBy: { order: "asc" } },
        },
      },
      report: true,
    },
  });

  if (!interview) throw NOT_FOUND("Interview");
  if (interview.room.createdById !== user.userId) throw FORBIDDEN();

  return { user, interview };
}

/**
 * Snapshot write access: allows either the room owner (via JWT) OR a candidate
 * with a valid room-ticket cookie. Also allows internal socket server calls.
 */
export async function requireSnapshotWriteAccess(request, interviewId) {
  const secret = request.headers.get("x-internal-secret");
  const internalSecret = process.env.INTERNAL_SECRET;

  // Reject if INTERNAL_SECRET is not configured — never allow empty-string match
  if (!internalSecret) throw FORBIDDEN();

  // Internal service call from socket server — verified by shared secret
  if (secret && internalSecret && timingSafeEqual(Buffer.from(secret), Buffer.from(internalSecret))) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!interview) throw NOT_FOUND("Interview");
    return { internal: true, interview };
  }

  // Get interview with room info
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { room: true },
  });
  if (!interview) throw NOT_FOUND("Interview");

  // Try room owner auth first
  try {
    const user = await getCurrentUser();
    if (user && interview.room.createdById === user.userId) {
      return { user, interview };
    }
  } catch {
    // Fall through to room-ticket check
  }

  // Check for room-ticket cookie (candidate access)
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const roomTicketCookie = cookieStore.get(`room-ticket-${interview.room.id}`);
  
  if (roomTicketCookie?.value) {
    try {
      const { jwtVerify } = await import("jose");
      const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(roomTicketCookie.value, SECRET);
      
      if (payload.roomId === interview.room.id && payload.type === "room-session") {
        return { interview };
      }
    } catch {
      // Invalid ticket, fall through to forbidden
    }
  }

  throw FORBIDDEN();
}

// ─── Wrapper for route handlers ──────────────────────────────────────────────

/**
 * Wraps a route handler so thrown NextResponse objects are returned directly.
 * This lets requireAuth/requireRoomOwner etc. throw instead of return.
 *
 * Usage:
 *   export const GET = withAuthz(async (req, ctx) => { ... });
 */
export function withAuthz(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof NextResponse) return err;
      // Prisma FK violation (P2003) or record not found (P2025) on user lookup
      // means the JWT references a deleted user — treat as unauthenticated
      if (err?.code === "P2003" || err?.code === "P2025") {
        return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
      }
      const { logger } = await import("@/lib/logger");
      logger.error({
        err,
        method: request.method,
        path: new URL(request.url).pathname,
      }, "[authz] unhandled error");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
