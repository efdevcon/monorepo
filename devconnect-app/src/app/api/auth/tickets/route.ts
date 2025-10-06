import { NextRequest, NextResponse } from 'next/server';
import { getPaidTicketsByEmail } from './pretix';
import { createServerClient } from '../supabaseServerClient';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TICKETS ROUTE HANDLER STARTED ===');

    // Get user email from query params (primary method for Netlify)
    let userEmail = request.nextUrl.searchParams.get('_user_email');

    // Debug logging for production troubleshooting
    console.log(
      'Query params:',
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    console.log('User email from query params:', userEmail);

    // Fallback to headers if query params don't work
    if (!userEmail) {
      userEmail = request.headers.get('x-user-email');
      console.log('Fallback: User email from headers:', userEmail);
    }

    console.log('All headers:', Array.from(request.headers.entries()));

    if (!userEmail) {
      console.log('No userEmail found in query params or headers');
      return NextResponse.json(
        {
          error: 'User email not found in session',
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: additionalEmails } = await supabase
      .from('devconnect_app_user')
      .select('additional_ticket_emails')
      .eq('email', userEmail)
      .single();

    try {
      console.log('Fetching tickets for user:', userEmail);

      const emails = [
        userEmail,
        ...(additionalEmails?.additional_ticket_emails || []),
      ];

      const allTickets = await Promise.all(
        emails.map((email) => getPaidTicketsByEmail(email))
      );
      // Fetch tickets for the authenticated user's email
      const tickets = allTickets.flat();

      console.log('Successfully fetched tickets:', tickets.length, 'tickets');

      return NextResponse.json({
        email: userEmail,
        tickets,
        count: tickets.length,
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      console.error(
        'Error details:',
        error instanceof Error ? error.stack : error
      );

      return NextResponse.json(
        {
          error: 'Failed to fetch tickets',
          message: error instanceof Error ? error.message : 'Unknown error',
          userEmail: userEmail, // Include for debugging
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('=== CRITICAL ERROR IN ROUTE HANDLER ===');
    console.error('Error:', error);
    console.error(
      'Stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );

    return NextResponse.json(
      {
        error: 'Critical route handler error',
        message:
          error instanceof Error ? error.message : 'Unknown critical error',
      },
      { status: 500 }
    );
  }
}
