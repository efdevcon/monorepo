import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../supabaseServerClient';

/**
 * Attach Additional Email for Ticket Retrieval
 * 
 * ✨ NOTE: This is one of the few places Supabase is still used for Para users!
 * - Para users authenticate with Para JWT (no Supabase)
 * - BUT we still use Supabase OTP to verify ownership of additional emails
 * - This is a separate concern from authentication (email verification only)
 * 
 * Flow:
 * 1. User wants to add tickets from another email
 * 2. Send OTP code to that email (Supabase)
 * 3. User verifies code (proves they own that email)
 * 4. Add email to their additional_ticket_emails array
 */
export const POST = async (request: NextRequest) => {
  const supabase = createServerClient();
  /* 1 - Extract user email provided by auth middleware */
  let userEmail = request.nextUrl.searchParams.get('_user_email');

  // Fallback to headers if query params don't work
  if (!userEmail) {
    userEmail = request.headers.get('x-user-email');
  }

  if (!userEmail) {
    console.log('No userEmail found in query params or headers');
    return NextResponse.json(
      {
        error: 'User email not found in session',
      },
      { status: 400 }
    );
  }

  const { email: emailToAttach } = await request.json();

  if (!emailToAttach) {
    return NextResponse.json(
      {
        error: 'No email not found in request body',
      },
      { status: 400 }
    );
  }

  /* 2 Send OTP code to user's email */
  const { data, error } = await supabase.auth.signInWithOtp({
    email: emailToAttach,
    options: {
      emailRedirectTo: 'https://app.devconnect.org/wallet/tickets',
    },
  });

  if (error) {
    console.error(
      'Error adding email: ' + emailToAttach + ' - ' + error.message
    );

    return NextResponse.json(
      {
        error: 'Error adding email: ' + error.message,
        message: error.code,
      },
      { status: 400 }
    );
  }

  /* 3 Return success response, frontend will display status e.g. "Verify your email to continue" */
  return NextResponse.json({
    success: true,
  });
};
