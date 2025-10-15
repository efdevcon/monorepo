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

  // Check if user is authorized to claim
  const authorizedEmails = [
    'kushagrasarathe@gmail.com',
  ];
  
  const isAuthorized = 
    authorizedEmails.includes(userEmail || '') || 
    userEmail?.endsWith('@ethereum.org');
  
  if (!isAuthorized) {
    return NextResponse.json(
      { 
        error: 'You are not eligible for this perk',
        message: 'This reward is only available to selected users'
      },
      { status: 403 }
    );
  }

  // Get Peanut link from environment variable
  const peanutLink = process.env.PEANUT_LINK;
  
  if (!peanutLink) {
    return NextResponse.json(
      { 
        error: 'Configuration error',
        message: 'Peanut link not configured'
      },
      { status: 500 }
    );
  }

  // Return the link
  return NextResponse.json({
    link: peanutLink,
    message: 'Claim link retrieved successfully'
  });
}

