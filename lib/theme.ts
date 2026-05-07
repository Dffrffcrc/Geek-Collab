// Fonts are loaded via expo-font in app/_layout.tsx using the matching
// @expo-google-fonts/* packages. Until they finish loading, RN falls
// back to the system default — usually a brief flash on first render.
export const HEADING_FONT = 'SpecialElite';
export const BODY_FONT = 'SpaceMono';
// Back-compat alias: components that didn't get migrated still use FONT.
export const FONT = BODY_FONT;

export const COLORS = {
  // Base colors
  bgDark: '#1a1a1a',
  bgLight: '#262626',
  bgPanel: '#232323',
  separator: '#3a3a3a',
  yellow: '#efeb45',
  border: '#4a4a4a',
  
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#d1d5db',
  textMuted: '#aaaaaa',
  textPlaceholder: '#888888',
  
  // Status colors
  primary: '#3b82f6',
  primaryLight: '#1e3a8a20',
  success: '#10b981',
  successLight: '#10b98120',
  danger: '#ef4444',
  dangerLight: '#ef444420',
  warning: '#f59e0b',
  warningLight: '#f59e0b20',
  
  // Legacy
  error: '#ff7676',
};
