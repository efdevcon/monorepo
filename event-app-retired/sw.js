// Kill switch for installs of the Devcon 8 app made from its pre-launch host,
// devcon-event-app.netlify.app (docs/app-domain-migration.md). A browser
// fetches /sw.js on every launch of an installed web app, so once this site
// answers on that host every install gets this worker as its "update", however
// old its copy of the app is. It takes over at once, throws away everything the
// app cached, drops the push subscription, reloads the app's open pages (they
// land on index.html, the "this app has moved" page) and unregisters itself.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      // Capped: a browser without a push service may never answer.
      await Promise.race([
        self.registration.pushManager.getSubscription().then((subscription) => subscription?.unsubscribe()),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]).catch(() => undefined);
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Started here, not awaited: a page's navigation waits for this worker to
      // finish activating, so awaiting it here would hold both up until the
      // browser gives up. The moved page unregisters this worker as well, in
      // case the worker is stopped before the line below runs.
      void Promise.all(clients.map((client) => client.navigate(client.url).catch(() => undefined))).then(() =>
        self.registration.unregister()
      );
    })()
  );
});
