import { NextRequest, NextResponse } from 'next/server'
import { getPaidTicketsByEmail } from './pretix'

export async function GET(request: NextRequest) {
  // Get user email from headers (set by middleware) or query params (fallback for Netlify)
  let userEmail = request.headers.get('x-user-email')
  
  // Debug logging for production troubleshooting
  console.log('Headers available:', Array.from(request.headers.entries()))
  console.log('Query params:', Object.fromEntries(request.nextUrl.searchParams.entries()))
  console.log('Initial userEmail from headers:', userEmail)
  
  // If header is not available, try query params (Netlify fallback)
  if (!userEmail) {
    userEmail = request.nextUrl.searchParams.get('_user_email')
    console.log('Fallback userEmail from query params:', userEmail)
  }
  
  // Decode if it was encoded
  if (userEmail) {
    userEmail = decodeURIComponent(userEmail)
    console.log('Decoded userEmail:', userEmail)
  }
  
  if (!userEmail) {
    console.log('No userEmail found in headers or query params')
    return NextResponse.json({ 
      error: 'User email not found in session' 
    }, { status: 400 })
  }

  try {
    // Fetch tickets for the authenticated user's email
    const tickets = await getPaidTicketsByEmail(userEmail)
    return NextResponse.json({ 
      email: userEmail,
      tickets,
      count: tickets.length
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tickets',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
