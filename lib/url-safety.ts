const WEB_PROTOCOLS = new Set(['http:', 'https:']);

export function isSafeExternalUrl(value: string, allowMailto = false): boolean {
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return false;

  try {
    const parsed = new URL(candidate);
    if (WEB_PROTOCOLS.has(parsed.protocol)) return true;
    return allowMailto && parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}
