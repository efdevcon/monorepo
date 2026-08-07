# Shared Library

This directory contains shared code and utilities used across the project.

## Setup

```bash
pnpm install   # from the repo root installs everything, including lib
```

## Development

- This library is used as a dependency in other projects via `"lib": "workspace:*"` in their package.json
- Any change to lib triggers Netlify builds across all projects (see root CLAUDE.md)

## Usage

This library is automatically linked to other projects in the monorepo. Import components and utilities as needed:

```typescript
import { Button } from 'lib/components/button'
```

shadcn/ui primitives live at `lib/shadcn/`.
