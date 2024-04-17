Devcon APP service worker caching strategy:

- Precache the app skeleton (basic html/js/css; layout, header, footer, etc.); this allows for fast installation time
- Cache event data at runtime because these datasets are huge (20-30mb) - if these were precached it would extend the precache step significantly, making it very hard to ship updates fast and reliably
- Event data is permanently cached by the service worker using a "version identifier", which is retrievable via the devcon api - whenever event data changes on the backend, the version returned by the devcon api will increment/change - the client can then ping this "version endpoint" instead of the underlying data to efficiently check for updates - if the client version is different from the backend version, the client can then redownload all data.
