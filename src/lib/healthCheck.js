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

export function logHealthCheck() {
  checkServerHealth().then(results => {
    console.log('[health] Server status:', results);
    
    if (results.nextjs.status !== 'healthy') {
      console.error('[health] Next.js server issue:', results.nextjs.error);
    }
    
    if (results.socket.status !== 'healthy') {
      console.error('[health] Socket server issue:', results.socket.error);
    }
  });
}