import type { Context } from '@netlify/edge-functions'

export default async (request: Request, context: Context) => {
  const response = await context.next()

  // Set headers to prevent compression
  response.headers.set('Content-Encoding', 'identity')

  return response
} 
