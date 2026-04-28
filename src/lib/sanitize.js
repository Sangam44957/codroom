/**
 * Client-side text sanitization utilities (ESM)
 */

const DANGEROUS_TAGS = /<(script|img|iframe|object|embed|link|style|svg)[^>]*>/gi;
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * Escapes HTML entities to prevent XSS
 * @param {string} str - Input string to escape
 * @returns {string} HTML-escaped string
 */
export function escapeHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Sanitizes user input by removing dangerous HTML tags and enforcing length limits
 * @param {string} str - Input string to sanitize
 * @param {number} maxLen - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeText(str, maxLen = 1000) {
  if (!str || typeof str !== "string") return "";
  
  return str
    .replace(DANGEROUS_TAGS, "") // Remove dangerous HTML tags
    .trim()                      // Remove leading/trailing whitespace
    .slice(0, maxLen);          // Enforce length limit
}

/**
 * Sanitizes chat messages by removing dangerous content but preserving readability
 * @param {string} message - Chat message to sanitize
 * @returns {string} Sanitized message (no HTML escaping since React handles XSS prevention)
 */
export function sanitizeChatMessage(message) {
  if (!message || typeof message !== "string") return "";
  
  return message
    .replace(DANGEROUS_TAGS, "") // Remove dangerous HTML tags
    .replace(/<[^>]*>/g, "")     // Remove any remaining HTML tags
    .trim()
    .slice(0, 2000);             // Chat messages limited to 2000 chars
}

/**
 * Sanitizes user name with stricter rules
 * @param {string} name - User name to sanitize
 * @returns {string} Sanitized name
 */
export function sanitizeName(name) {
  if (!name || typeof name !== "string") return "";
  
  return name
    .replace(DANGEROUS_TAGS, "")
    .replace(/[<>]/g, "")        // Remove any remaining angle brackets
    .trim()
    .slice(0, 80);              // Names limited to 80 chars
}