import React from 'react'
import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class AppDocument extends Document {
  render() {
    return (
      <Html lang="en" data-scroll-behavior="smooth">
        <Head>
          {/* Favicons / app icons — SVG first for modern browsers, ICO as
              fallback. PNG sizes cover Android/PWA contexts. */}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
          <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          {/* Adding the specific font weights for bold (e.g. 700) makes the font look so much worse :-P Bit of a mystery, since bolding works fine without it (probably just a fallback that happens to look good) */}
          {/* <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          /> */}

          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700;900&family=Poppins:wght@300;400;500;600;700;800&display=swap"
            rel="stylesheet"
          />

          {/* {process.env.NODE_ENV === 'production' && (
            <scriptz
              type="text/javascript"
              dangerouslySetInnerHTML={{
                __html: `<!-- Matomo -->
                var _paq = window._paq = window._paq || [];
                /* tracker methods like "setCustomDimension" should be called before "trackPageView" 
                _paq.push(["setExcludedQueryParams", ["code","gist"]]);
                _paq.push(['trackPageView']);
                _paq.push(['enableLinkTracking']);
                (function() {
                  var u="https://ethereumfoundation.matomo.cloud/";
                  _paq.push(['setTrackerUrl', u+'matomo.php']);
                  _paq.push(['setSiteId', '8']);
                  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
                  g.async=true; g.src='//cdn.matomo.cloud/ethereumfoundation.matomo.cloud/matomo.js'; s.parentNode.insertBefore(g,s);
                })();
              <!-- End Matomo Code -->`,
              }}
            />
          )} */}
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
