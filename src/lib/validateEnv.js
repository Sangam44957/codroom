/**
 * Environment variable validation for security-critical settings
 */

import { logger } from "./logger.js";

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL', 
  'JWT_SECRET',
  'INTERNAL_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SOCKET_URL'
];

const SECURITY_VARS = [
  'GROQ_API_KEY',
  'BREVO_API_KEY', 
  'REDIS_URL'
];

export function validateEnvironment() {
  const missing = [];
  const weak = [];

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else if (varName.includes('SECRET') && value.length < 32) {
      weak.push(`${varName} (minimum 32 characters required)`);
    }
  }

  // Check security variables
  for (const varName of SECURITY_VARS) {
    const value = process.env[varName];
    if (!value) {
      logger.warn(`Optional security variable ${varName} not set`);
    }
  }

  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (weak.length > 0) {
    logger.error({ weak }, 'Weak security configuration detected');
    throw new Error(`Weak security configuration: ${weak.join(', ')}`);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 64) {
    logger.warn('JWT_SECRET should be at least 64 characters for production use');
  }

  logger.info('Environment validation passed');
}