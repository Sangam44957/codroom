export function sanitizeName(name) {
  if (!name || typeof name !== "string") return null;
  const clean = name.trim().slice(0, 50);
  return clean.length > 0 ? clean : null;
}

export function sanitizeText(text, maxLength = 2000) {
  if (!text || typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}