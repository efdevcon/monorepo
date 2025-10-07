import { createServerClient } from '../supabaseServerClient';

export const ensureUser = async (userEmail: string) => {
  const supabase = createServerClient();

  // Try to find existing user
  const { data: existingUser } = await supabase
    .from('devconnect_app_user')
    .select('*')
    .eq('email', userEmail)
    .single();

  // If user exists, return it
  if (existingUser) {
    return existingUser;
  }

  // If user doesn't exist, create a new one
  const { data: newUser, error } = await supabase
    .from('devconnect_app_user')
    .upsert({
      email: userEmail,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return newUser;
};
