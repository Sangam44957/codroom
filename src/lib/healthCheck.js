import { logger } from "./logger";

export async function checkServerHealth() {
  const results = {
    nextjs: { status: 'unknown', error: null },
    socket: { status: 'unknown', error: null }
  };

  // Check Next.js server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const nextResponse = await fetch('/api/health', {
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (nextResponse.ok) {
      results.nextjs.status = 'healthy';
    } else {
      results.nextjs.status = 'error';
      results.nextjs.error = `HTTP ${nextResponse.status}`;
    }
  } catch (error) {
    results.nextjs.status = 'error';
    results.nextjs.error = error.name === 'AbortError' ? 'Timeout' : error.message;
  }

  // Check Socket.IO server
  try {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const socketResponse = await fetch(`${socketUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (socketResponse.ok) {
      results.socket.status = 'healthy';
    } else {
      results.socket.status = 'error';
      results.socket.error = `HTTP ${socketResponse.status}`;
    }
  } catch (error) {
    results.socket.status = 'error';
    results.socket.error = error.name === 'AbortError' ? 'Timeout' : error.message;
  }

  return results;
}

let _lastHealthCheckAt = 0;
const HEALTH_CHECK_THROTTLE_MS = 30_000; // Only log once every 30 seconds

export function logHealthCheck() {
  const now = Date.now();
  if (now - _lastHealthCheckAt < HEALTH_CHECK_THROTTLE_MS) return;
  _lastHealthCheckAt = now;

  checkServerHealth().then(results => {
    logger.info({ results }, "Server health status");
    
    if (results.nextjs.status !== 'healthy') {
      logger.warn({ error: results.nextjs.error }, "Next.js server issue");
    }
    
    if (results.socket.status !== 'healthy') {
      logger.warn({ error: results.socket.error }, "Socket server issue");
    }
  });
}