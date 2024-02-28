import React from 'react'
import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class AppDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          {/* Adding the specific font weights for bold (e.g. 700) makes the font look so much worse :-P Bit of a mystery, since bolding works fine without it (probably just a fallback that happens to look good) */}
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&family=Space+Mono&display=swap"
            rel="stylesheet"
          />
          {/*   TODO: Get another app ID - this is sharing a site id with devcon.org
            Also install a nextjs plugin to track inline page views ()
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `var _paq = window._paq = window._paq || [];
                  _paq.push(['trackPageView']);
                  _paq.push(['enableLinkTracking']);
                  (function() {
                  var u="https://matomo.ethereum.org/";
                  _paq.push(['setTrackerUrl', u+'matomo.php']);
                  _paq.push(['setSiteId', '8']);
                  var secondaryTracker = 'https://ethereumfoundation.matomo.cloud/matomo.php';
                  var secondaryWebsiteId = 3;
                  _paq.push(['addTracker', secondaryTracker, secondaryWebsiteId]);
                  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
                  g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
                  })();`,
            }}
          /> */}
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
