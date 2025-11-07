import { NextRequest, NextResponse } from 'next/server';
import { getPaidTicketsByEmail } from './pretix';
import { createServerClient } from '../supabaseServerClient';
import PretixStores from './pretix-stores-list';

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

      // Check for refresh query param to bypass cache
      const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

      // Check cache first
      const { data: cachedData } = await supabase
        .from('ticket_cache')
        .select('ticket_data, updated_at')
        .eq('email', userEmail)
        .single();

      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime();
        const twoMinutesInMs = 2 * 60 * 1000;
        const eightHoursInMs = 8 * 60 * 60 * 1000;

        // If refreshing, enforce 2-minute minimum between refreshes
        if (refresh && cacheAge < twoMinutesInMs) {
          console.log('Rate limit: returning cached tickets for user:', userEmail);
          return NextResponse.json(cachedData.ticket_data);
        }

        // Normal cache check (8 hours)
        if (!refresh && cacheAge < eightHoursInMs) {
          console.log('Returning cached tickets for user:', userEmail);
          return NextResponse.json(cachedData.ticket_data);
        }
      }

      // Fetch fresh data from Pretix stores
      const storeFetchPromises = PretixStores.map(async (store) => {
        console.log(
          'Fetching tickets for store:',
          store.organizerSlug,
          store.eventSlug
        );
        return Promise.all(
          emails.map(async (email) => {
            console.log('Fetching tickets for email:', email);
            try {
              return await getPaidTicketsByEmail(email, store);
            } catch (error) {
              console.error(
                `Failed to fetch tickets for ${email} from ${store.organizerSlug}/${store.eventSlug}:`,
                error
              );
              return []; // Return empty array on error, continue with other stores
            }
          })
        );
      });

      const allTickets = await Promise.all(storeFetchPromises);

      // Fetch tickets for the authenticated user's email
      const tickets = allTickets.flat().flat();

      const sideTickets = tickets.filter(
        (ticket) => ticket.eventSlug !== 'cowork'
      );
      const mainTickets = tickets.filter(
        (ticket) => ticket.eventSlug === 'cowork'
      );

      console.log('Successfully fetched tickets:', tickets.length, 'tickets');

      const responseData = {
        email: userEmail,
        tickets: mainTickets,
        sideTickets: sideTickets,
        count: tickets.length,
      };

      // Update cache
      await supabase
        .from('ticket_cache')
        .upsert({
          email: userEmail,
          ticket_data: responseData,
          updated_at: new Date().toISOString(),
        });

      return NextResponse.json(responseData);
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
