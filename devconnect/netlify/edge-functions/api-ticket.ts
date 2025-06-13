import type { Context } from '@netlify/edge-functions'

export default async (request: Request, context: Context) => {
  const response = await context.next()

  // Set headers to prevent compression
  response.headers.set('Content-Encoding', 'identity')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
} 
