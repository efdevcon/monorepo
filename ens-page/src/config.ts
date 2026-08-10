// The ENS name whose records drive the page. Baked at build time via
// VITE_ENS_NAME (d.krux.eth for testing, devcon.eth for production); a
// ?name=x.eth query param overrides it so any name can be tested against the
// same bundle.
const NAME_RE = /^[a-z0-9-.]+\.eth$/i

function resolveName(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('name')
  if (fromQuery && NAME_RE.test(fromQuery.trim())) return fromQuery.trim().toLowerCase()
  return (import.meta.env.VITE_ENS_NAME as string | undefined) ?? 'd.krux.eth'
}

export const ENS_NAME = resolveName()
export const LINKS_API = (import.meta.env.VITE_LINKS_API as string | undefined) ?? 'https://devcon.org/api/links/'
