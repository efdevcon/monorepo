# Devcon/nect Monorepo

This is the main repository for events organized by the Ethereum Foundation

- [Devcon](https://devcon.org/) - the Ethereum conference for developers, thinkers, and makers.
- [Devconnect](https://devconnect.org/) - a week-long gathering of independent Ethereum events to learn, share, and make progress together.

## Projects

Active:

- [devcon](/devcon/README.md) - main Devcon website @ [devcon.org](https://devcon.org/)
- [devcon-api](/devcon-api/README.md) - API for all Devcon-related apps @ [api.devcon.org](https://api.devcon.org/)
- [event-app](/event-app/README.md) - offline-first PWA for Devcon 8 (successor to devcon-app)
- [archive](/archive/README.md) - Devcon video archive @ [archive.devcon.org](https://archive.devcon.org/)
- [lib](/lib/README.md) - shared components for all projects
- [data](/devcon-api/data) - all Devcon data, recorded talks, sessions, speaker info, etc.
- [discounts](/discounts/README.md) - standalone bun scripts generating discount-eligibility lists (addresses/GitHub usernames)

Legacy / archival:

- [devcon-app](/devcon-app/README.md) - Devcon SEA (2024) conference app @ [app.devcon.org](https://app.devcon.org/)
- [devconnect](/devconnect/README.md) - Devconnect website @ [devconnect.org](https://devconnect.org/)
- [devconnect-app](/devconnect-app/README.md) - Devconnect ARG conference app @ [app.devconnect.org](https://app.devconnect.org/)
- [social-ticket](/social-ticket/docs/notes.md) - Devcon SEA social image generator; mostly superseded by devcon.org `/api/social/*`
- [atproto-slurper](/atproto-slurper/README.md) - atproto event ingestion for Devconnect (deletion candidate)
- [devcon-ai](/devcon-ai/README.md) - experimental RAG/AI backend (not used in production)
- perks-portal - standalone perks site scaffold, never used in production

## Documentation

- Monorepo-wide agent rules: [CLAUDE.md](/CLAUDE.md)
- Cross-project docs (AV pipeline, repo notes, GitHub Actions): [docs/](/docs)
- Per-project notes: `<project>/docs/notes.md`

## Development

- "pnpm install" in root installs everything at once. To install specific projects, you can add a filter, e.g.: "pnpm install --filter devconnect-app...", which means install only the devconnect-app package and its dependencies.
- "pnpm run dev" inside projects folders to run them

Some additional notes:

- make sure your pnpm version is up to date (if you are unsure which version to use, refer to the "packageManager" key in the root package.json)
- never commit any non-pnpm lockfiles, it will brick netlify (exception: `discounts/` is intentionally bun-based and not part of the pnpm workspace)
- pnpm does not let you use phantom dependencies, which are packages that are not defined in package.json - this can happen when certain projects have packages as peer dependencies, that you can import without installing them directly - this is not allowed using pnpm and it will fail - can be resolved by explicitly installing them (which adds them to package.json).
