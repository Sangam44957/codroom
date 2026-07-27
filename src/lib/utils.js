/**
 * Resolve the problems array from a room object.
 * Handles both the new multi-problem format and legacy single-problem field.
 */
export function resolveProblems(room) {
  if (!room) return [];
  if (room.problems?.length) return room.problems.map((rp) => rp.problem);
  if (room.problem) return [room.problem];
  return [];
}