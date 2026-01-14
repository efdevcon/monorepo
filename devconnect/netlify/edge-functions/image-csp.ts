import type { Context } from '@netlify/edge-functions'

export default async (request: Request, context: Context) => {
  const response = await context.next()

  // Set CSP headers to prevent SVG XSS attacks
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';"
  )
  response.headers.set('X-Content-Type-Options', 'nosniff')

  return response
}
