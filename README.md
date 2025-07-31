# Devcon/nect Monorepo

This is the main repository for events organized by the Ethereum Foundation

- [Devcon](https://devcon.org/) - the Ethereum conference for developers, thinkers, and makers.
- [Devconnect](https://devconnect.org/) - a week-long gathering of independent Ethereum events to learn, share, and make progress together.

## Projects

- [archive](/archive/README.md) - Devcon video archive @ [archive.devcon.org](https://archive.devcon.org/)
- [devcon](/devcon/README.md) - main Devcon website @ [devcon.org](https://devcon.org/)
- [devcon-api](/devcon-api/README.md) - API for all Devcon-related apps @ [api.devcon.org](https://api.devcon.org/)
- [devcon-app](/devcon-app/README.md) - Devcon conference scheduling App @ [app.devcon.org](https://app.devcon.org/)
- [devconnect](/devconnect/README.md) - main Devconnect website @ [devconnect.org](https://devconnect.org/)
- [data](/devcon-api/data) - all Devcon data, recorded talks, sessions, speaker info, etc.
- [lib](/lib/README.md) - shared components for all projects

Development

- "pnpm install" in root installs everything at once. To install specific projects, you can add a filter, e.g.: "pnpm install --filter devconnect-app...", which means install only the devconnect-app package and its dependencies.
- "pnpm run dev" inside projects folders to run them

Some additional notes:

- make sure your pnpm version is up to date (if you are unsure which version to use, refer to the "packageManager" key in the root package.json)
- never commit any non-pnpm lockfiles, it will brick netlify
- pnpm does not let you use phantom dependencies, which are packages that are not defined in package.json - this can happen when certain projects have packages as peer dependencies, that you can import without installing them directly - this is not allowed using pnpm and it will fail - can be resolved by explicitly installing them (which adds them to package.json).
