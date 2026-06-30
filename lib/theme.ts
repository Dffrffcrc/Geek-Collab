// Fonts are loaded two ways and the chain below tries both, in order:
//   1. `SpecialElite` / `SpaceMono` — bundled .ttf registered by expo-font
//      in app/_layout.tsx. Works on localhost.
//   2. `"Special Elite"` / `"Space Mono"` — Google Fonts CDN loaded via
//      <link> in app/+html.tsx. Works everywhere the CDN is reachable
//      and is the reliable fallback when the bundled .ttf 404s on
//      static hosts (Cloudflare in particular).
//   3. `monospace` — system fallback so we never end up on a sans-serif.
//
// react-native-web emits this string directly as `font-family` in CSS,
// so the comma-separated cascade just works on web. Web-only target.
export const HEADING_FONT = 'SpecialElite, "Special Elite", monospace';
export const BODY_FONT = 'SpaceMono, "Space Mono", monospace';
// Back-compat alias: components that didn't get migrated still use FONT.
export const FONT = BODY_FONT;

export const COLORS = {
  bgDark: '#1a1a1a',
  bgPanel: '#232323',
  separator: '#3a3a3a',
  yellow: '#efeb45',
  border: '#4a4a4a',
  textPrimary: '#ffffff',
  textMuted: '#aaaaaa',
  textPlaceholder: '#888888',
  error: '#ff7676',
  // Warm amber used for status pills (QUARANTINED, BANNED, report reasons).
  // Distinct from `yellow` (primary accent) and `error` (form/system errors)
  // so warning-state UI doesn't clash with the primary palette.
  warn: '#e0b150',
  warnBg: 'rgba(224, 177, 80, 0.16)',
  warnBorder: 'rgba(224, 177, 80, 0.5)',
};
