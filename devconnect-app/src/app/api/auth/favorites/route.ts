import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../supabaseServerClient';
import { ensureUser } from '../user-data/ensure-user';

const setFavoriteEvents = async (events: string[], userEmail: string) => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('devconnect_app_user')
    .update({ favorite_events: events })
    .eq('email', userEmail);

  if (error) {
    throw new Error(`Failed to set favorite events: ${error.message}`);
  }

  return true;
};

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

  const { favoriteEvents } = await request.json();

  try {
    await setFavoriteEvents(favoriteEvents, userEmail);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set favorite events' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};
