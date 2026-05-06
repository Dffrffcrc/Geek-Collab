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
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const GLOBAL_CSS = `
  html, body { background: #1a1a1a; margin: 0; }

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
