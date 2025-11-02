import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../supabaseServerClient';
import { ensureUser } from '../../user-data/ensure-user';

/**
 * Verify Email Ownership (Part 2 of attach-email flow)
 *
 * ✨ NOTE: This is one of the few places Supabase is still used for Para users!
 * - Verifies the OTP code sent to additional email
 * - Once verified, adds email to additional_ticket_emails array
 * - This is separate from authentication (email verification only)
 */
export const POST = async (request: NextRequest) => {
  const supabase = createServerClient();
  /* 4 (continued from attach-email route) - Extract user email provided by auth middleware */
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

  const { verificationCode: rawCode, emailToVerify: rawEmail } =
    await request.json();

  // Trim whitespace from inputs (common copy-paste issue)
  const verificationCode = rawCode?.trim();
  const emailToVerify = rawEmail?.trim().toLowerCase();

  if (verificationCode.length !== 6) {
    return NextResponse.json(
      {
        error: 'Verification code must be 6 digits',
      },
      { status: 400 }
    );
  }

  if (!verificationCode || !emailToVerify) {
    return NextResponse.json(
      {
        error: 'Verification code or email to verify not found in request body',
      },
      { status: 400 }
    );
  }

  if (emailToVerify === userEmail) {
    return NextResponse.json(
      {
        error: 'Email to verify is the same as the user email, aborting.',
      },
      { status: 400 }
    );
  }

  // Create a fresh anon client (NOT service role) for OTP verification
  // Service role key bypasses OTP checks - we need anon key for proper verification
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Add detailed logging to debug OTP issues
  console.log('OTP verification attempt:', {
    email: emailToVerify,
    timestamp: new Date().toISOString(),
    codeLength: verificationCode?.length,
  });

  const { error } = await supabaseAnon.auth.verifyOtp({
    email: emailToVerify,
    token: verificationCode,
    type: 'email',
  });

  if (error) {
    console.error('OTP verification failed:', {
      email: emailToVerify,
      error: error.message,
      errorCode: error.code,
      errorStatus: error.status,
    });

    return NextResponse.json(
      {
        error: 'Error verifying OTP: ' + error.message,
        message: error.code,
      },
      { status: 400 }
    );
  }

  console.log('OTP verified successfully for:', emailToVerify);

  // Calling verifyOTP writes some auth shit to that instance of supabase (PAIN to debug btw), so we need to create a new unauthed client
  const supabaseUnauthed = createServerClient();

  const userData = await ensureUser(userEmail);

  const currentEmails = userData?.additional_ticket_emails || [];
  const emailAlreadyExists = currentEmails.includes(emailToVerify);

  if (emailAlreadyExists) {
    return NextResponse.json(
      {
        error: `${emailToVerify} is already added to your account.`,
      },
      { status: 400 }
    );
  }

  const { error: upsertError } = await supabaseUnauthed
    .from('devconnect_app_user')
    .upsert(
      {
        email: userEmail,
        additional_ticket_emails: [...currentEmails, emailToVerify],
      },
      {
        onConflict: 'email',
      }
    );

  if (upsertError) {
    return NextResponse.json(
      {
        error: 'Error upserting user: ' + upsertError.message,
        message: upsertError.code,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    email: userEmail,
  });
};
