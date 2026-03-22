/**
 * Validates required environment variables at startup.
 * Import this at the top of any server entry point.
 * Throws immediately if a required variable is missing.
 */

const REQUIRED = ["JWT_SECRET", "INTERNAL_SECRET", "DATABASE_URL"];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(
      `\n❌ Missing required environment variable: ${key}\n` +
      `   Add it to your .env file and restart.\n`
    );
  }
}
