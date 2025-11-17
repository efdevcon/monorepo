import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../supabaseServerClient';
import { ensureUser } from '../user-data/ensure-user';

const setQuestCompletions = async (
  questStates: Record<string, any>,
  userEmail: string
) => {
  const supabase = createServerClient();

  console.log('[setQuestCompletions] Processing for user:', userEmail);
  console.log('[setQuestCompletions] Received quest states:', Object.keys(questStates).length, 'quests');

  // Convert quest states to a map of questId: completedAt for completed quests
  const questCompletions: Record<string, number> = {};
  Object.entries(questStates).forEach(([questId, state]) => {
    if (state.completedAt) {
      questCompletions[questId] = state.completedAt;
    }
  });

  console.log('[setQuestCompletions] Saving to DB:', Object.keys(questCompletions).length, 'completed quests');

  const { data, error } = await supabase
    .from('devconnect_app_user')
    .update({ quests: questCompletions })
    .eq('email', userEmail);

  if (error) {
    console.error('[setQuestCompletions] DB error:', error);
    throw new Error(`Failed to set quest completions: ${error.message}`);
  }

  console.log('[setQuestCompletions] Successfully saved to DB');
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

