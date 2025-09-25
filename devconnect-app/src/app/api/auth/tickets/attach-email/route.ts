import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../supabaseServerClient';

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
