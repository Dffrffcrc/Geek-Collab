// URL detection and normalisation for the LinkPreviewCard component.
//
// This is intentionally MVP — favicon + domain only, no OG scrape. Real
// previews (title, description, hero image) need either a Cloud Function
// that fetches the page server-side and extracts OG tags, or a third-party
// service like microlink.io. Both are easy to layer on later without
// changing the extraction API here.

// Matches http(s) URLs. Excludes trailing punctuation that's usually part of
// sentence structure rather than the URL (`.`, `,`, `)`, `]`, `>`, `!`, `?`).
// Backticks, quotes, and whitespace end the URL. Handles URLs bare or inside
// markdown links like [text](https://example.com).
const URL_REGEX = /https?:\/\/[^\s<>"'`\]]+/gi;
const TRAILING_PUNCT_REGEX = /[.,!?;:)\]]+$/;

// Extract unique URLs from a body of text, in first-appearance order. Caps
// at `max` to avoid flooding the UI with previews on link-heavy posts.
export function extractUrls(body: string, max = 3): string[] {
  if (!body) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = body.match(URL_REGEX) ?? [];
  for (const raw of matches) {
    // Strip closing markdown-link paren (matches an opening `(` that isn't in
    // the URL itself). Cheapest approach: strip trailing punctuation greedily.
    const cleaned = raw.replace(TRAILING_PUNCT_REGEX, '');
    if (!cleaned) continue;
    // Dedup by the cleaned URL — a post that repeats the same link shouldn't
    // render N cards.
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}

// Extract the display-friendly hostname (e.g., `youtube.com`, not
// `www.youtube.com`) for the link preview card label.
export function hostnameFor(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// A concise "path + query" summary shown as the URL row on the card. Trims
// the origin off, caps length so long URLs don't stretch the card.
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

// Favicon URL from Google's public s2 service. Free, no auth, high uptime,
// caches on Google's edge so it's fast. Returns a fallback icon (a generic
// globe) when the site has no favicon.
export function faviconFor(url: string, sizePx = 64): string {
  const host = hostnameFor(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sizePx}`;
}
