import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../middleware';
import { createServerClient } from '../supabaseServerClient';
import { getPaidTicketsByEmail } from '../tickets/pretix';
import { mainStore } from '../tickets/pretix-stores-list';

// Normalize Gmail addresses
function normalizeGmailForClaim(email: string): string {
  const [localPart, domain] = email.toLowerCase().split('@');
  if (!localPart || !domain) return email.toLowerCase();
  
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots and strip +alias (Gmail ignores both)
    const normalized = localPart.replace(/\./g, '').split('+')[0];
    return normalized + '@gmail.com';
  }
  return email.toLowerCase();
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth(request);

  if (!authResult.success) {
    return authResult.error;
  }

  const { user } = authResult;
  const userEmail = user.email?.toLowerCase();

  if (!userEmail) {
    return NextResponse.json(
      {
        error: 'Authentication error',
        message: 'User email not found',
      },
      { status: 400 }
    );
  }

  // Check whitelist eligibility
  // const eligibleEmails = process.env.PEANUT_LINKS?.split(',').map(e => e.trim().toLowerCase()) || [];
  // const isEligible = eligibleEmails.includes(userEmail) || userEmail.endsWith('@ethereum.org') || userEmail.endsWith('getpara.com') || userEmail.endsWith('usecapsule.com') || userEmail.endsWith('@peanut.me');
  const isEligible = true;

  if (!isEligible) {
    return NextResponse.json(
      {
        error: 'You are not eligible for this perk yet',
        message: 'This reward is only available to early access users',
      },
      { status: 403 }
    );
  }

  // Create Supabase client
  const supabase = createServerClient();

  try {
    // Get additional emails from the user's profile (case-insensitive lookup)
    // Then get exact email from DB for FK constraints (retro-compatible with any casing)
    const { data: userData } = await supabase
      .from('devconnect_app_user')
      .select('email, additional_ticket_emails')
      .ilike('email', userEmail)
      .single();

    // Use exact email from DB for FK operations (handles both old lowercase and new mixed-case)
    const exactEmail = userData?.email || userEmail;

    // Build list of all emails to check for tickets
    const allEmails = [
      userEmail,
      ...(userData?.additional_ticket_emails || []),
    ];

    // Fetch tickets for all user emails
    console.log('Fetching tickets for emails:', allEmails);
    const allTicketsByEmail = await Promise.all(
      allEmails.map((email) => getPaidTicketsByEmail(email, mainStore))
    );

    // Extract all checked-in ticket secrets from all orders
    const checkedInTicketSecrets: string[] = [];
    for (const orders of allTicketsByEmail) {
      for (const order of orders) {
        for (const ticket of order.tickets) {
          if (ticket.secret && ticket.hasCheckedIn) {
            checkedInTicketSecrets.push(ticket.secret);
          }
        }
      }
    }

    console.log('Found checked-in ticket secrets:', checkedInTicketSecrets.length);

    if (checkedInTicketSecrets.length === 0) {
      return NextResponse.json(
        {
          error: 'You haven\'t checked in yet',
          message:
            'You can claim this perk once you\'ve checked in with your Devconnect ticket.',
        },
        { status: 403 }
      );
    }

    // Check if user has already claimed a link
    const { data: existingClaim, error: checkError } = await supabase
      .from('devconnect_app_claiming_links')
      .select('*')
      .eq('claimed_by_user_email', exactEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('Error checking existing claim:', checkError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to check claim status',
        },
        { status: 500 }
      );
    }

    // If user already claimed, return existing link
    if (existingClaim) {
      return NextResponse.json({
        link: existingClaim.link,
        amount: existingClaim.amount,
        claimed_date: existingClaim.claimed_date,
        ticket_secret: existingClaim.ticket_secret_proof,
        already_claimed: true,
        message: 'You have already claimed this perk',
      });
    }

    // For Gmail, check if any normalized variation has already claimed
    const normalizedEmail = normalizeGmailForClaim(exactEmail);
    const domain = exactEmail.split('@')[1]?.toLowerCase();
    
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      // Fetch all Gmail claims and check for normalized duplicates in-memory
      const { data: gmailClaims } = await supabase
        .from('devconnect_app_claiming_links')
        .select('claimed_by_user_email')
        .not('claimed_by_user_email', 'is', null)
        .or('claimed_by_user_email.ilike.%@gmail.com,claimed_by_user_email.ilike.%@googlemail.com');

      if (gmailClaims) {
        const hasDuplicate = gmailClaims.some(claim => 
          normalizeGmailForClaim(claim.claimed_by_user_email) === normalizedEmail
        );
        
        if (hasDuplicate) {
          return NextResponse.json({
            error: 'Already claimed',
            message: 'This email has already been used to claim.',
            already_claimed: true,
          }, { status: 403 });
        }
      }
    }

    // Find first unclaimed ticket secret (not already used in database)
    const { data: claimedSecrets } = await supabase
      .from('devconnect_app_claiming_links')
      .select('ticket_secret_proof')
      .not('ticket_secret_proof', 'is', null);

    const usedSecrets = new Set(
      claimedSecrets?.map((c) => c.ticket_secret_proof) || []
    );

    const availableSecret = checkedInTicketSecrets.find(
      (secret) => !usedSecrets.has(secret)
    );

    if (!availableSecret) {
      return NextResponse.json(
        {
          error: 'All tickets already used',
          message:
            'All your tickets have been used for claims. Each ticket can only be used once.',
        },
        { status: 403 }
      );
    }

    console.log('Using ticket secret for claim:', availableSecret);

    // Get the user's wallet address from the request headers (passed by frontend)
    const userAddress = request.headers.get('x-wallet-address');

    // Retry logic to handle race conditions
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < MAX_RETRIES) {
      attempt++;
      console.log(`Claim attempt ${attempt}/${MAX_RETRIES}`);

      // Get next available unclaimed link
      const { data: availableLink, error: fetchError } = await supabase
        .from('devconnect_app_claiming_links')
        .select('*')
        .is('claimed_by_user_email', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (fetchError || !availableLink) {
        console.error('Error fetching available link:', fetchError);
        return NextResponse.json(
          {
            error: 'No links available',
            message:
              'All peanut links have been claimed. Please try again later.',
          },
          { status: 404 }
        );
      }

      // Update the link to mark it as claimed
      const { data: claimedLink, error: updateError } = await supabase
        .from('devconnect_app_claiming_links')
        .update({
          claimed_by_user_email: exactEmail,
          claimed_by_address: userAddress?.toLowerCase() || null,
          claimed_date: new Date().toISOString(),
          ticket_secret_proof: availableSecret,
        })
        .eq('id', availableLink.id)
        .is('claimed_by_user_email', null) // Double-check it's still unclaimed
        .select()
        .single();

      if (!updateError && claimedLink) {
        // Success! Return the claimed link
        console.log(`Successfully claimed link on attempt ${attempt}`);
        return NextResponse.json({
          link: claimedLink.link,
          amount: claimedLink.amount,
          claimed_date: claimedLink.claimed_date,
          ticket_secret: claimedLink.ticket_secret_proof,
          already_claimed: false,
          message: 'Claim link retrieved successfully',
        });
      }

      // Update failed - likely race condition
      lastError = updateError;
      console.log(
        `Claim attempt ${attempt} failed (likely race condition):`,
        updateError
      );

      // If not the last attempt, wait before retrying with exponential backoff
      if (attempt < MAX_RETRIES) {
        const backoffMs = 100 * attempt; // 100ms, 200ms, 300ms
        console.log(`Waiting ${backoffMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // All retries exhausted
    console.error('All claim attempts failed:', lastError);
    return NextResponse.json(
      {
        error: 'Claim failed',
        message:
          'Failed to claim link after multiple attempts. Please try again.',
      },
      { status: 409 }
    );
  } catch (error) {
    console.error('Unexpected error in claim-peanut:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
