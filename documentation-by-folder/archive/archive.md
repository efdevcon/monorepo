Mostly a static website at this point, the complexity is moreso in how the data is generated (that's more of an AV/pretalx pipeline thing, which is documented separately)

Data lives in devcon-api just like it does for the app - ingested via the running api

- Events (/events, /events/:id) — list of Devcon editions
- Sessions (/sessions, /sessions/:slug, /sessions/:id/related) — talk/session records
- Playlists — served from src/services/playlists.ts (local data in src/data/playlists/)

If you ever need to add some "extra" videos or missing videos manually, it can easily be done by manually adding files to the api - that's how we did it for Devconnect ARG
