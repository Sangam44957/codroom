const DANGEROUS_TAGS = /<(script|img|iframe|object|embed|link|style|svg)[^>]*>/gi;

function sanitizeName(name) {
  if (!name || typeof name !== "string") return null;
  const clean = name.replace(DANGEROUS_TAGS, "").replace(/[<>]/g, "").trim().slice(0, 50);
  return clean.length > 0 ? clean : null;
}

function sanitizeText(text, maxLength = 2000) {
  if (!text || typeof text !== "string") return "";
  return text.replace(DANGEROUS_TAGS, "").trim().slice(0, maxLength);
}

module.exports = { sanitizeName, sanitizeText };