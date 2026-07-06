import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Customize the document root for static-rendered web. Adds a slim, dark
// scrollbar that matches the rest of the app and resets the body so
// ScrollView overflow works correctly.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#fff100" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Forum.GeeksHacking" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Google Fonts CDN — the reliable source for "Space Mono" /
            "Special Elite" everywhere the bundled .ttf might 404 (e.g.
            Cloudflare Pages, where SPA fallbacks mis-route font
            requests to index.html). The font-family chain in lib/theme.ts
            references these directly, so no @font-face aliasing is needed.
            Preload tells the browser to fetch the stylesheet at high
            priority during the initial HTML parse — without it the
            stylesheet request blocks behind app JS and the first paint
            ends up using the monospace fallback for hundreds of ms. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Special+Elite&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Special+Elite&display=swap"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const GLOBAL_CSS = `
  /* Fill the viewport. Without these the static-rendered HTML on first
     paint sizes to its content (sidebar + topbar collapse) and the page
     looks "mobile-sized" until JS hydration. Setting 100% from html down
     to #root keeps the flex shell correct from the very first frame. */
  html, body { background: #1a1a1a; margin: 0; height: 100%; width: 100%; }
  #root { display: flex; height: 100%; width: 100%; }
  /* Set the document default to the body chain so any text rendered
     before React mounts (or before its inline fontFamily kicks in) still
     gets the typewriter look instead of the browser default sans-serif. */
  html, body, #root { font-family: SpaceMono, "Space Mono", monospace; }

  /* WebKit (Chrome / Edge / Safari) */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: #3a3a3a;
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  ::-webkit-scrollbar-thumb:hover { background: #4a4a4a; background-clip: padding-box; }
  ::-webkit-scrollbar-corner { background: transparent; }

  /* Firefox */
  * { scrollbar-width: thin; scrollbar-color: #3a3a3a transparent; }
`;
