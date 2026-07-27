const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "INTERNAL_SECRET",
  "GROQ_API_KEY",
];

const OPTIONAL_WARN = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "REDIS_URL",
];

export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌ Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join("\n")}\n   Add them to your .env file and restart.\n`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error("\n❌ JWT_SECRET must be at least 32 characters.\n");
    process.exit(1);
  }

  if (process.env.INTERNAL_SECRET.length < 32) {
    console.error("\n❌ INTERNAL_SECRET must be at least 32 characters.\n");
    process.exit(1);
  }

  const missingOptional = OPTIONAL_WARN.filter((k) => !process.env[k]);
  if (missingOptional.length) {
    console.warn(`\n⚠️  Optional env vars not set (degraded functionality):\n${missingOptional.map((k) => `   - ${k}`).join("\n")}\n`);
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.warn("\n⚠️  NEXT_PUBLIC_APP_URL is not set. CSRF protection and invite links may not work correctly.\n");
  }
}
