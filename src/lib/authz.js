/**
 * Centralized authorization helper.
 * Every API route that touches a room, interview, snapshot, note, or report
 * must go through these helpers. Deny-by-default: if ownership cannot be
 * confirmed, access is rejected.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
      room: { include: { problem: true } },
      report: true,
    },
  });

  if (!interview) throw NOT_FOUND("Interview");
  if (interview.room.createdById !== user.userId) throw FORBIDDEN();

  return { user, interview };
}

/**
 * Snapshot write access: the socket server calls the snapshot API using a
 * shared internal secret header. Falls back to room-owner auth for external
 * callers (e.g. tests, admin tools).
 */
export async function requireSnapshotWriteAccess(request, interviewId) {
  const secret = request.headers.get("x-internal-secret");
  const internalSecret = process.env.INTERNAL_SECRET;

  // Reject if INTERNAL_SECRET is not configured — never allow empty-string match
  if (!internalSecret) throw FORBIDDEN();

  // Internal service call from socket server — verified by shared secret
  if (secret === internalSecret) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!interview) throw NOT_FOUND("Interview");
    return { internal: true, interview };
  }

  // External call — must be room owner
  const { user, interview } = await requireInterviewOwner(interviewId);
  return { internal: false, user, interview };
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
      console.error("[authz] Unhandled error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
