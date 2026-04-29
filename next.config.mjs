import { withSentryConfig } from "@sentry/nextjs";

const SOCKET_ORIGIN = process.env.NEXT_PUBLIC_SOCKET_URL
  ? new URL(process.env.NEXT_PUBLIC_SOCKET_URL).origin
  : "http://localhost:3001";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
  : "http://localhost:3000";

const IS_PROD = process.env.NODE_ENV === "production";

const securityHeaders = [
  // Prevent browsers from MIME-sniffing the content-type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block clickjacking completely
  { key: "X-Frame-Options", value: "DENY" },
  // Stop sending Referer to cross-origin destinations
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser features we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  },
  // HSTS — only set in production (localhost doesn't have TLS)
  ...(IS_PROD
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' required for Next.js inline scripts (hydration chunks)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://browser.sentry-cdn.com",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "worker-src 'self' blob:",
      // Fixed: sentry wildcard subdomain must use https://*.ingest.sentry.io
      `connect-src 'self' ${SOCKET_ORIGIN} ${APP_ORIGIN} https://*.ingest.sentry.io https://0.peerjs.com https://cdn.jsdelivr.net wss: ws:`,
      "media-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pino", "pino-pretty"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});