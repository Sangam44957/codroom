const { test, expect } = require('@jest/globals');

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.SMOKE_TEST_TIMEOUT) || 30000;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

describe('Smoke Tests', () => {
  test('Health endpoint responds', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/health`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBeDefined();
    expect(data.redis).toBeDefined();
  });

  test('Landing page loads', async () => {
    const response = await fetchWithTimeout(BASE_URL);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  test('API routes are accessible', async () => {
    const routes = [
      '/api/auth/me',
      '/api/problems',
      '/api/templates'
    ];

    for (const route of routes) {
      const response = await fetchWithTimeout(`${BASE_URL}${route}`);
      expect(response.status).toBeLessThan(500);
    }
  });

  test('Socket.IO server is running', async () => {
    const response = await fetchWithTimeout(`${BASE_URL.replace(':3000', ':3001')}/socket.io/`);
    expect(response.status).toBeLessThan(500);
  });

  test('Static assets load', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/favicon.ico`);
    expect(response.status).toBe(200);
  });
});