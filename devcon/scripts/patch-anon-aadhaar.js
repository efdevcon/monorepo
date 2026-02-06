/**
 * Patches @anon-aadhaar/core prover.ts (ArrayBuffer -> Buffer type error).
 * Runs after install so the fix is applied before build.
 */
const fs = require('fs')
const path = require('path')

function findAndPatch(cwd) {
  const proverPath = path.join(cwd, 'src', 'prover.ts')
  if (!fs.existsSync(proverPath)) return false
  let content = fs.readFileSync(proverPath, 'utf8')
  if (!content.includes('return data as Buffer') || content.includes('return data as unknown as Buffer')) {
    return false
  }
  content = content.replace('return data as Buffer', 'return data as unknown as Buffer')
  fs.writeFileSync(proverPath, content)
  return true
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
