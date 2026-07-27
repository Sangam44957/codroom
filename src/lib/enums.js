export const ROOM_STATUS = ["waiting", "active", "completed"];
export const INTERVIEW_STATUS = ["in_progress", "completed", "evaluated"];
export const DIFFICULTY = ["easy", "medium", "hard"];
export const RECOMMENDATION = ["STRONG_HIRE", "HIRE", "BORDERLINE", "NO_HIRE"];

export function assertEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${fieldName}: "${value}". Allowed: ${allowed.join(", ")}`);
  }
}
