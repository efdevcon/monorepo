# DevConnect

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Prerequisites

- Node.js 18.x or later (required for Next.js 13.4.9 and other dependencies)
- Yarn package manager
- Access to the shared library

## Getting Started

1. First, install the shared library:

```bash
cd ../lib
yarn install
```

2. Install project dependencies:

```bash
cd ../devconnect
yarn install
```

3. Run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

## Development

- The page auto-updates as you edit files
- API routes can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello)
- The `pages/api` directory is mapped to `/api/*`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
