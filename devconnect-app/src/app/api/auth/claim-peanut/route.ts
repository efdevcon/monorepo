import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../middleware';
import { createServerClient } from '../supabaseServerClient';
import { getPaidTicketsByEmail } from '../tickets/pretix';

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
        message: 'User email not found'
      },
      { status: 400 }
    );
  }

  // Check whitelist eligibility
  const eligibleEmails = process.env.PEANUT_LINKS?.split(',').map(e => e.trim().toLowerCase()) || [];
  // const isEligible = eligibleEmails.includes(userEmail) || userEmail.endsWith('@ethereum.org') || userEmail.endsWith('getpara.com') || userEmail.endsWith('usecapsule.com') || userEmail.endsWith('@peanut.me');
  const isEligible = true;

  if (!isEligible) {
    return NextResponse.json(
      { 
        error: 'You are not eligible for this perk yet',
        message: 'This reward is only available to early access users'
      },
      { status: 403 }
    );
  }

  // Create Supabase client
  const supabase = createServerClient();

  try {
    // Get additional emails from the user's profile
    const { data: userData } = await supabase
      .from('devconnect_app_user')
      .select('additional_ticket_emails')
      .eq('email', userEmail)
      .single();

    // Build list of all emails to check for tickets
    const allEmails = [
      userEmail,
      ...(userData?.additional_ticket_emails || []),
    ];

    // Fetch tickets for all user emails
    console.log('Fetching tickets for emails:', allEmails);
    const allTickets = await Promise.all(
      allEmails.map((email) => getPaidTicketsByEmail(email))
    );

    // Extract all ticket secrets from all orders
    const ticketSecrets: string[] = [];
    for (const orders of allTickets) {
      for (const order of orders) {
        for (const ticket of order.tickets) {
          if (ticket.secret) {
            ticketSecrets.push(ticket.secret);
          }
        }
      }
    }

    console.log('Found ticket secrets:', ticketSecrets.length);

    if (ticketSecrets.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid ticket found',
          message: 'Add your devconnect ticket here to claim this perk'
        },
        { status: 403 }
      );
    }

    // Check if user has already claimed a link
    const { data: existingClaim, error: checkError } = await supabase
      .from('devconnect_app_claiming_links')
      .select('*')
      .eq('claimed_by_user_email', userEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing claim:', checkError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to check claim status'
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
        message: 'You have already claimed this perk'
      });
    }

    // Find first unclaimed ticket secret (not already used in database)
    const { data: claimedSecrets } = await supabase
      .from('devconnect_app_claiming_links')
      .select('ticket_secret_proof')
      .not('ticket_secret_proof', 'is', null);

    const usedSecrets = new Set(
      claimedSecrets?.map(c => c.ticket_secret_proof) || []
    );

    const availableSecret = ticketSecrets.find(secret => !usedSecrets.has(secret));

    if (!availableSecret) {
      return NextResponse.json(
        {
          error: 'All tickets already used',
          message: 'All your tickets have been used for claims. Each ticket can only be used once.'
        },
        { status: 403 }
      );
    }

    console.log('Using ticket secret for claim:', availableSecret);

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
          message: 'All peanut links have been claimed. Please try again later.'
        },
        { status: 404 }
      );
    }

    // Get the user's wallet address from the request headers (passed by frontend)
    const userAddress = request.headers.get('x-wallet-address');

    // Update the link to mark it as claimed
    const { data: claimedLink, error: updateError } = await supabase
      .from('devconnect_app_claiming_links')
      .update({
        claimed_by_user_email: userEmail,
        claimed_by_address: userAddress?.toLowerCase() || null,
        claimed_date: new Date().toISOString(),
        ticket_secret_proof: availableSecret
      })
      .eq('id', availableLink.id)
      .is('claimed_by_user_email', null) // Double-check it's still unclaimed
      .select()
      .single();

    if (updateError || !claimedLink) {
      console.error('Error claiming link:', updateError);
      // Link might have been claimed by someone else in the meantime
      return NextResponse.json(
        { 
          error: 'Claim failed',
          message: 'Failed to claim link. Please try again.'
        },
        { status: 409 }
      );
    }

    // Return the claimed link
    return NextResponse.json({
      link: claimedLink.link,
      amount: claimedLink.amount,
      claimed_date: claimedLink.claimed_date,
      ticket_secret: claimedLink.ticket_secret_proof,
      already_claimed: false,
      message: 'Claim link retrieved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in claim-peanut:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

