import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../auth/middleware';
import { createServerClient } from '../../auth/supabaseServerClient';
import { ensureUser } from '../../auth/user-data/ensure-user';

/**
 * POST /api/user/add-address
 * Adds a wallet address to the user's addresses array in devconnect_app_user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    
    if (!authResult.success) {
      return authResult.error;
    }

    const { user } = authResult;
    const { address } = await request.json();

    // Validate address
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Valid address is required' },
        { status: 400 }
      );
    }

    // Normalize address to lowercase for consistency
    const normalizedAddress = address.toLowerCase();

    // Get user email (from Supabase or Para)
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Ensure user exists in devconnect_app_user
    await ensureUser(userEmail);

    // Get current addresses
    const supabase = createServerClient();
    const { data: existingUser } = await supabase
      .from('devconnect_app_user')
      .select('addresses')
      .eq('email', userEmail)
      .single();

    const currentAddresses = existingUser?.addresses || [];

    // Check if address already exists (case-insensitive)
    const addressExists = currentAddresses.some(
      (addr: string) => addr.toLowerCase() === normalizedAddress
    );

    if (addressExists) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Address already exists',
          addresses: currentAddresses 
        },
        { status: 200 }
      );
    }

    // Add new address to the array
    const updatedAddresses = [...currentAddresses, normalizedAddress];

    // Update user's addresses
    const { error: updateError } = await supabase
      .from('devconnect_app_user')
      .update({ addresses: updatedAddresses })
      .eq('email', userEmail);

    if (updateError) {
      console.error('Error updating addresses:', updateError);
      return NextResponse.json(
        { error: 'Failed to update addresses' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Address added successfully',
        addresses: updatedAddresses 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in add-address API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

