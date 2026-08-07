# Monorepo rules

## Package management

- pnpm workspaces, always use `pnpm` (never npm or yarn). This setup is deliberate, do not deviate.
- When adding a new project, register it in `pnpm-workspace.yaml` at the repo root.
- Shared code lives in `lib/`, installable from any project by adding `"lib": "workspace:*"` to its package.json.

## Builds & deploys (Netlify)

- Every commit starts builds for ALL projects (Netlify limitation). Each project cancels its own build via a git-diff check in its `netlify.toml`, so irrelevant builds spin down cheaply.
- Any change under `lib/` triggers real builds across all projects.
- Some deploys use filtered installs (`pnpm install --filter <project>`) to avoid installing the whole workspace.
- Details and screenshots: `docs/repo/repo.md`.

## GitHub Actions

- `devcon-translate.yml`: machine-translates any change under `devcon/content/en/` on push to main. Never hand-edit `hi`/`mr` content.
- `sync-pretalx*.yml`: merge Pretalx schedule changes into devcon-api data. Triggered by a Pretalx webhook when a schedule is (re)published.
- Full inventory with per-workflow notes: `docs/github-actions.md`.

## Documentation layout

- Cross-project and working docs: `docs/` (AV pipeline: `docs/av/`, repo notes: `docs/repo/`).
- Per-project notes: `<project>/docs/notes.md` (event-app uses `event-app/docs/architecture.md`).
- Project-specific agent instructions: `<project>/CLAUDE.md` (see `devcon/CLAUDE.md`, `event-app/CLAUDE.md`).
