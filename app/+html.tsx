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
        {/* CDN font fallback. The bundled .ttf at
            /assets/node_modules/@expo-google-fonts/... can fail to load on
            some static hosts (Cloudflare in particular, where SPA fallbacks
            mis-route font requests to index.html). Loading the same families
            from Google Fonts gives us a reliable fallback that the local()
            @font-face aliases below resolve to. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
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

  /* @font-face aliases so anywhere we set fontFamily: 'SpaceMono' /
     'SpecialElite' (the keys registered via expo-font) the browser can
     fall back to the Google-Fonts-loaded "Space Mono" / "Special Elite"
     if the bundled .ttf 404s on the host. */
  @font-face {
    font-family: 'SpaceMono';
    src: local('Space Mono'), local('SpaceMono-Regular');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'SpecialElite';
    src: local('Special Elite'), local('SpecialElite-Regular');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

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
