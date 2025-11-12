import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../supabaseServerClient';
import { ensureUser } from '../user-data/ensure-user';

const setQuestCompletions = async (
  questStates: Record<string, any>,
  userEmail: string
) => {
  const supabase = createServerClient();

  // Convert quest states to a map of questId: completedAt for completed quests
  const questCompletions: Record<string, number> = {};
  Object.entries(questStates).forEach(([questId, state]) => {
    if (state.completedAt) {
      questCompletions[questId] = state.completedAt;
    }
  });

  const { data, error } = await supabase
    .from('devconnect_app_user')
    .update({ quests: questCompletions })
    .eq('email', userEmail);

  if (error) {
    throw new Error(`Failed to set quest completions: ${error.message}`);
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

  const { questStates } = await request.json();

  try {
    await setQuestCompletions(questStates, userEmail);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set quest completions' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};

