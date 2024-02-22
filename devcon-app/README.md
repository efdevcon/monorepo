NOTES ON PWA:

    next-pwa uses workbox under the hood, it emits: sw.js and workbox.****.js

    These files work like this:
        The service worker (sw.js) is registered, and Workbox (workbox.****.js) scripts are imported.
        self.skipWaiting() is invoked to ensure the new service worker will activate immediately after installation.
        Workbox precacheAndRoute lists resources to be precached during the install event that Workbox manages internally.
        When the installation phase is complete (including precaching), if self.skipWaiting() was called, the service worker will

    Update logic:
        Whenever a user opens the pwa, it will fetch "sw.js" - if this changed (even a single byte), the service worker will kick into gear and go through the listed steps above.

    Notes on nextjs in the context of PWA:
        Nextjs generates JSON files (the output from getStaticProps) that pages need to function - the pages are built individually and are stored as completed html pages with all data inlined
        You would think the JSON files are therefore not needed in the PWA precache - the problem is that in a SPA you navigate between pages without a reload - and in order to do this on the go,
        you need to fetch those JSON files (you aren't moving from html to html, you are moving from html to a "fully managed javascript rendering" experience)

        Lets say page A and B both return the full schedule data in getStaticProps - nextjs will then generate a .json file for each of these pages - and both would be precached in the end. This is
        obviously inefficient, so it's better to fetch this data in some shared manner.
