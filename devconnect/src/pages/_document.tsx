import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* {process.env.NODE_ENV === 'production' && (
            <script
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
                    _paq.push(['setSiteId', '29']);
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

export default MyDocument
