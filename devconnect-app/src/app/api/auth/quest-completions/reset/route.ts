import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../supabaseServerClient';
import { ensureUser } from '../../user-data/ensure-user';

export const POST = async (request: NextRequest) => {
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

  await ensureUser(userEmail);

  const supabase = createServerClient();

  // Clear all quest completions by setting to empty object
  const { error } = await supabase
    .from('devconnect_app_user')
    .update({ quests: {} })
    .eq('email', userEmail);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to reset quest completions' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};

