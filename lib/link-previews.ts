











const URL_REGEX = /https?:\/\/[^\s<>"'`\]]+/gi;
const TRAILING_PUNCT_REGEX = /[.,!?;:)\]]+$/;



export function extractUrls(body: string, max = 3): string[] {
  if (!body) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = body.match(URL_REGEX) ?? [];
  for (const raw of matches) {


    const cleaned = raw.replace(TRAILING_PUNCT_REGEX, '');
    if (!cleaned) continue;


    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}



export function hostnameFor(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}



export function pathSummaryFor(url: string, maxLength = 60): string {
  try {
    const u = new URL(url);
    const summary = `${u.pathname}${u.search}`.replace(/^\/$/, '');
    if (!summary) return u.hostname;
    return summary.length > maxLength ? summary.slice(0, maxLength - 1) + '…' : summary;
  } catch {
    return url;
  }
}




export function faviconFor(url: string, sizePx = 64): string {
  const host = hostnameFor(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sizePx}`;
}
