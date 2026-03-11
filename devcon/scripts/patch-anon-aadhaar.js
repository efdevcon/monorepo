/**
 * Patches @anon-aadhaar/core prover.ts (strict TypeScript cast errors).
 * Runs after install so the fix is applied before build.
 */
const fs = require('fs')
const path = require('path')

const REPLACEMENTS = [
  ['return data as Buffer', 'return data as unknown as Buffer'],
  [') as ArrayBuffer', ') as unknown as ArrayBuffer'],
]

function findAndPatch(cwd) {
  const proverPath = path.join(cwd, 'src', 'prover.ts')
  if (!fs.existsSync(proverPath)) return false
  let content = fs.readFileSync(proverPath, 'utf8')
  let changed = false
  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from) && !content.includes(to)) {
      content = content.split(from).join(to)
      changed = true
    }
  }
  if (changed) fs.writeFileSync(proverPath, content)
  return changed
}

// Resolve package location (works with pnpm symlinks)
let pkgRoot
try {
  pkgRoot = path.dirname(require.resolve('@anon-aadhaar/core/package.json'))
} catch {
  process.exit(0)
}

if (findAndPatch(pkgRoot)) {
  console.log('patched @anon-aadhaar/core src/prover.ts')
}
