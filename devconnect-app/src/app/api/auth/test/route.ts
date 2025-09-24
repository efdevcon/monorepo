import { createServerClient } from '../supabaseServerClient';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async (request: NextRequest, response: NextResponse) => {
  return NextResponse.json({ message: 'Test route' });
  //   const supabase = createServerClient();

  //   // This query should work regardless of RLS if using service role
  //   const { data, error } = await supabase
  //     .from('devconnect_app_user')
  //     .select('*')
  //     .limit(1);

  //   const { data: upsertData, error: upsertError } = await supabase
  //     .from('devconnect_app_user')
  //     .upsert(
  //       {
  //         email: 'test@test.com',
  //         additional_ticket_emails: ['tes2t@test.com'],
  //       },
  //       {
  //         onConflict: 'email',
  //       }
  //     );

  //   console.log('upsertData', upsertData);
  //   console.log('upsertError', upsertError);

  //   if (error) {
  //     console.error('Still getting RLS error with service role:', error);
  //     console.log('Key being used:', process.env.SUPABASE_KEY?.substring(0, 40));
  //   } else {
  //     console.log('Service role key is working correctly');
  //   }

  //   return NextResponse.json({ data, error, upsertData, upsertError });
};
