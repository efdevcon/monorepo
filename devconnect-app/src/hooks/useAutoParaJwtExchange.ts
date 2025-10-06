'use client';

import { useEffect, useRef } from 'react';
import { useIssueJwt } from '@getpara/react-sdk';
import { createClient } from '@supabase/supabase-js';
import { authService } from '@/services/authService';

interface UseAutoParaJwtExchangeProps {
  paraConnected: boolean;
  paraAddress: string | null;
  supabaseHasUser: boolean;
  supabaseInitialized: boolean;
}

/**
 * Automatically exchanges Para JWT for Supabase session when Para is connected
 * This eliminates the need to manually click "Get Supabase JWT" button
 */
export function useAutoParaJwtExchange({
  paraConnected,
  paraAddress,
  supabaseHasUser,
  supabaseInitialized,
}: UseAutoParaJwtExchangeProps) {
  const { issueJwtAsync } = useIssueJwt();
  const isExchangingRef = useRef(false);
  const hasExchangedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const shouldExchange =
      paraConnected &&
      paraAddress &&
      supabaseInitialized &&
      !supabaseHasUser &&
      !isExchangingRef.current &&
      !hasExchangedRef.current.has(paraAddress);

    if (!shouldExchange) {
      return;
    }

    const performAutoExchange = async () => {
      isExchangingRef.current = true;
      hasExchangedRef.current.add(paraAddress);

      try {
        console.log('🔄 [AUTO_JWT_EXCHANGE] Starting automatic Para JWT exchange for', paraAddress);

        // Step 1: Issue Para JWT (will prompt for biometric/OTP if needed)
        const { token: paraJwt } = await issueJwtAsync();
        console.log('✅ [AUTO_JWT_EXCHANGE] Para JWT obtained');

        // Step 2: Exchange Para JWT for Supabase JWT
        const response = await fetch('/api/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paraJwt }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ [AUTO_JWT_EXCHANGE] Exchange failed:', errorData);
          throw new Error(`HTTP error ${response.status}: ${errorData.error || 'Unknown error'}`);
        }

        const { supabaseJwt } = await response.json();
        console.log('✅ [AUTO_JWT_EXCHANGE] Supabase JWT obtained');

        // Step 3: Set Supabase session
        const supabase = authService.getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        await supabase.auth.setSession({
          access_token: supabaseJwt,
          refresh_token: supabaseJwt,
        });

        // Step 4: Verify session
        const { data: { user } } = await supabase.auth.getUser();
        console.log('✅ [AUTO_JWT_EXCHANGE] Supabase session set successfully for', user?.email);
        console.log('🎉 [AUTO_JWT_EXCHANGE] Authentication complete! RequiresAuthHOC will now work.');

      } catch (error) {
        console.error('❌ [AUTO_JWT_EXCHANGE] Failed:', error);
        // Remove from cache so it can be retried
        hasExchangedRef.current.delete(paraAddress);
      } finally {
        isExchangingRef.current = false;
      }
    };

    performAutoExchange();
  }, [
    paraConnected,
    paraAddress,
    supabaseHasUser,
    supabaseInitialized,
    issueJwtAsync,
  ]);
}

