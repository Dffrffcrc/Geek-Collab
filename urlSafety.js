// Lightweight, dependency-free URL scheme allowlisting used to harden the
// markdown renderer against javascript:/data:/vbscript:/file: schemes on web.

const SAFE_SCHEMES = ['http', 'https', 'mailto'];

// Decode numeric (&#106;) and hex (&#x6a;) HTML entities so that entity-encoded
// scheme tricks (e.g. "&#x6a;avascript:") are normalized before we check.
const decodeEntities = (input) =>
  input.replace(/&#(x?)([0-9a-fA-F]+);?/g, (match, isHex, code) => {
    const point = parseInt(code, isHex ? 16 : 10);
    if (Number.isNaN(point)) return match;
    try {
      return String.fromCodePoint(point);
    } catch {
      return match;
    }
  });

// Strip whitespace and control characters that browsers ignore inside schemes
// (e.g. "java\tscript:" or leading/trailing nulls).
const normalize = (input) =>
  decodeEntities(String(input))
    .replace(/[\u0000-\u0020\u007F-\u009F]/g, '')
    .trim();

export const isSafeUrl = (url) => {
  if (url === null || url === undefined) return false;

  const normalized = normalize(url).toLowerCase();
  if (!normalized) return false;

  // Match an explicit URL scheme, e.g. "https:", "javascript:".
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);

  // No explicit scheme means a relative/anchor/fragment link (e.g. "#x",
  // "/foo", "page.html"). These cannot carry a dangerous scheme, so allow them.
  if (!schemeMatch) return true;

  return SAFE_SCHEMES.includes(schemeMatch[1]);
};

// Stricter check for resources that are actually fetched/loaded (e.g. images):
// only http(s) is allowed. mailto/relative/anchor are not valid image sources.
export const isHttpUrl = (url) => {
  if (url === null || url === undefined) return false;
  const normalized = normalize(url).toLowerCase();
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);
  if (!schemeMatch) return false;
  return schemeMatch[1] === 'http' || schemeMatch[1] === 'https';
};

// Returns the original url if it is safe to open, otherwise null.
export const safeUrl = (url) => (isSafeUrl(url) ? url : null);

export default isSafeUrl;
