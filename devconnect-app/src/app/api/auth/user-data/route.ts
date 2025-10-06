import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../supabaseServerClient';
import { ensureUser } from './ensure-user';

export const GET = async (request: NextRequest) => {
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

  const userData = await ensureUser(userEmail);

  return NextResponse.json(userData);
};
