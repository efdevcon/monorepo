# DevConnect

Devconnect website @ [devconnect.org](https://devconnect.org/). Next.js + TinaCMS, kept around mostly for archival purposes; the community-event schedule is fed by [atproto-slurper](../atproto-slurper/).

## Getting Started

```bash
pnpm install   # from the repo root (installs lib and all workspace deps)
pnpm dev       # http://localhost:3000
```

## Project Structure

- `cms/` - Content management system files for translations
- `src/` - Main source code directory
  - `ai/` - AI-related functionality
  - `common/components` - Project specific components
  - `pages/` - Next.js pages and API routes
  - `store/` - State management
  - `styles/` - Main style files
  - `types/` - TypeScript type definitions
- `public/` - Public static assets
- `styles/` - Global styles and Tailwind configuration
- `tina/` - TinaCMS configuration and templates

More context (perks, atproto snapshot plan): [docs/notes.md](./docs/notes.md)
