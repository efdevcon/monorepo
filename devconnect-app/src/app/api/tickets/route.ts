import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../auth'
import { getPaidTicketsByEmail } from './pretix'

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth(request)
  
  if (!authResult.success) {
    return authResult.error
  }

  const userEmail = authResult.user.email
  
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