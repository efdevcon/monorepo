# social-ticket

Originally the Devcon SEA social-sharing image app.

As of Aug 2026 the session/AV/personal-schedule cards were rebuilt inside `devcon/` (`/api/social/*`, Supabase-cached, see `docs/av/av-stack-overview.md` section 4). The only route still served from this app is the personal attendee ticket card (`/[name]`), used by the devcon.org homepage Hero. Once that is migrated too, this app can be deleted.
