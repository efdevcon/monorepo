import { NextRequest, NextResponse } from 'next/server'
import { getPaidTicketsByEmail } from './pretix'

export async function GET(request: NextRequest) {
  // Get user email from headers (set by middleware)
  const userEmail = request.headers.get('x-user-email')
  
  // Debug logging for production troubleshooting
  console.log('All headers:', Array.from(request.headers.entries()))
  console.log('User email from headers:', userEmail)

  if (!userEmail) {
    console.log('No userEmail found in headers')
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
