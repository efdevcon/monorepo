import { NextResponse } from 'next/server'
import { withAuth, type AuthenticatedRequest } from '../withAuth'
import { getPaidTicketsByEmail } from './pretix'

async function getTickets(request: AuthenticatedRequest) {
  const userEmail = request.user.email
  
  if (!userEmail) {
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

// Export the authenticated handler
export const GET = withAuth(getTickets)
