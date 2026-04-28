/**
 * Secure cookie utilities with proper security settings
 */

export const SECURE_COOKIE_DEFAULTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
};

export const SESSION_COOKIE_OPTIONS = {
  ...SECURE_COOKIE_DEFAULTS,
  sameSite: 'lax', // Allow navigation from external sites
  maxAge: 24 * 60 * 60 // 24 hours
};

export const ROOM_TICKET_OPTIONS = {
  ...SECURE_COOKIE_DEFAULTS,
  sameSite: 'lax', // Allow candidate access from invite links
  maxAge: 4 * 60 * 60 // 4 hours
};

export const CSRF_TOKEN_OPTIONS = {
  ...SECURE_COOKIE_DEFAULTS,
  sameSite: 'strict',
  maxAge: 60 * 60 // 1 hour
};

/**
 * Clear a cookie securely
 */
export function clearCookie(response, name, options = {}) {
  response.cookies.set(name, '', {
    ...SECURE_COOKIE_DEFAULTS,
    ...options,
    maxAge: 0,
    expires: new Date(0)
  });
}

/**
 * Set a secure cookie with validation
 */
export function setSecureCookie(response, name, value, options = {}) {
  if (!value || typeof value !== 'string') {
    throw new Error('Cookie value must be a non-empty string');
  }
  
  if (value.length > 4096) {
    throw new Error('Cookie value exceeds maximum size (4KB)');
  }
  
  response.cookies.set(name, value, {
    ...SECURE_COOKIE_DEFAULTS,
    ...options
  });
}