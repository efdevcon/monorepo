# Shared Library

This directory contains shared code and utilities used across the project.

## Setup

```bash
# Install dependencies
yarn install
```

## Development

- This library is used as a dependency in other parts of the project
- Make sure to run `yarn install` here to keep TypeScript happy
- Any changes to this library may require rebuilding dependent projects

## Usage

This library is automatically linked to other projects in the monorepo. Import components and utilities as needed:

```typescript
import { Button } from 'lib/components/button'
```
