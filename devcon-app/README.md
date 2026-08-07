# Devcon App (legacy, Devcon SEA 2024)

Conference app used at Devcon SEA @ [app.devcon.org](https://app.devcon.org/). Kept for archival purposes and UX reference; Devcon 8 uses [event-app](../event-app/) instead.

## Install and run

```bash
pnpm install   # from the repo root
pnpm dev
```

Optional: `RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED=false` in .env to remove some warnings.

## Devcon API

The devcon app is served by the devcon api (api.devcon.org). For outside contributors: running the API locally is not recommended/difficult, as it requires a lot of setup.

## PWA cache/install strategy

- Precache the app skeleton (basic html/js/css; layout, header, footer, etc.); this allows for fast installation time
- Cache event data at runtime because these datasets are huge (20-30mb) - if these were precached it would extend the precache step significantly, making it very hard to ship updates fast and reliably
- Event data is permanently cached by the service worker using a "version identifier", which is retrievable via the devcon api - whenever event data changes on the backend, the version returned by the devcon api will increment/change - the client can then ping this "version endpoint" instead of the underlying data to efficiently check for updates - if the client version is different from the backend version, the client can then redownload all data.

More context: [docs/notes.md](./docs/notes.md)
