import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../middleware';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth(request);
  
  if (!authResult.success) {
    return authResult.error;
  }

  const { user } = authResult;
  const userEmail = user.email?.toLowerCase();

  // Get Peanut links from environment variable
  const peanutLinksEnv = process.env.PEANUT_LINKS;
  
  if (!peanutLinksEnv) {
    return NextResponse.json(
      {
        error: 'Configuration error',
        message: 'Peanut links not configured'
      },
      { status: 500 }
    );
  }

  let peanutLinks: Record<string, string>;
  try {
    const parsedLinks = JSON.parse(peanutLinksEnv) as Record<string, string>;
    // Normalize all email keys to lowercase for case-insensitive comparison
    peanutLinks = Object.fromEntries(
      Object.entries(parsedLinks).map(([email, link]) => [email.toLowerCase(), link])
    );
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Configuration error',
        message: 'Invalid peanut links configuration'
      },
      { status: 500 }
    );
  }

  // Check if user has a link assigned
  let peanutLink = peanutLinks[userEmail || ''];

  // If no specific link found, check if user has @ethereum.org email
  if (!peanutLink && userEmail?.endsWith('@ethereum.org')) {
    peanutLink = peanutLinks['@ethereum.org'];
  }
  
  if (!peanutLink) {
    return NextResponse.json(
      { 
        error: 'You are not eligible for this perk',
        message: 'This reward is only available to selected users'
      },
      { status: 403 }
    );
  }

  // Return the link
  return NextResponse.json({
    link: peanutLink,
    message: 'Claim link retrieved successfully'
  });
}

