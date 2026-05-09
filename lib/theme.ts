// Fonts are loaded via expo-font in app/_layout.tsx using the matching
// @expo-google-fonts/* packages. Until they finish loading, RN falls
// back to the system default — usually a brief flash on first render.
export const HEADING_FONT = 'SpecialElite';
export const BODY_FONT = 'SpaceMono';
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
