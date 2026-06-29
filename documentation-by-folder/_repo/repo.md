# repo notes

monorepo is powered by pnpm - I wouldn't deviate from this, we tried many, many things before landing on this, and its pretty clean at this point

projects can import from the shared lib by adding this line in the package.json:
"lib": "workspace:\*"

whenever you add a new project, add it to pnpm-workspace.yaml in the root of the repo

# netlify

for some deployments you don't need a full pnpm install (this installs all packages for the entire repo) - you can run "pnpm install --filter devcon-api" (or something like this) to only install packages needed by the devcon-api project - the main place this is relevant is for the netlify build which is currently configured with these flags (iirc, I am locked out of netlify already)

the monorepo _starts_ all builds on every commit to the repo (netlify limitation), but each project opts out/cancels the build with a git diff configured in their netlify.toml files - its slightly inefficient (because the builds spin up before spinning down), but not much work is done in cancelled builds

any changes to lib triggers a build across all projects - you can inspect the "cancel-build.png" or netlify.toml files to see how this works
