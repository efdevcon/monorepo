# Devcon/nect Monorepo

## TL:DR;

- npm install inside lib before you start for types to be available
- run whatever project you like as if you weren't working in a monorepo (yay, no added complexity :^D)

## Some notes:

- the reason we don't use yarn workspaces to solve shared dependencies is that there were too many hacks required to make it work - hoisting means typescript gets confused, webpack/nextjs gets confused, weird edge cases/traps, harder to reason about, harder to install in isolation on netlify, and so on - it sounds simple in theory, but it isn't (as of 19/10/2023).
- lib actually doesn't need _all_ dependencies installed, _just enough for types to be present/for typescript to work_ (e.g. @react/types is enough, it doesn't also need to install react, even though it uses react, read more below). Note: some packages may need to be installed simply because the types are included in the package itself. But this is fine; no harm done even if you install too much, it won't get used anyway (read more below).
- the _actual dependencies_ must be installed by the project that _uses_ lib ("the consumer") - we then use simple webpack config to tell any imports from lib to resolve dependencies in the consumer's node_modules rather than it's own - voila, no hosting needed (and the complications that brings), and we only have one source of dependencies (no version conflicts, no duplicated output, etc.). This also means its the consumers responsibility to have all packages installed when it uses lib - which is fine, but worth keeping in mind, because it also means changes to lib that require new packages or versions need immediate action in the consumers.
