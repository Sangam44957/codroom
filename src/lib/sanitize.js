/**
 * Client-side text sanitization utilities (ESM)
 */

const DANGEROUS_TAGS = /<(script|img|iframe|object|embed|link|style|svg)[^>]*>/gi;

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