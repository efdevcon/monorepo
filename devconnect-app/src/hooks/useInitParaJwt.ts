'use client';

import { useEffect, useRef } from 'react';
import { useIssueJwt } from '@getpara/react-sdk';
import { mutate } from 'swr';

interface UseInitParaJwtProps {
  paraConnected: boolean;
  paraAddress: string | null;
}

/**
 * ✨ Initialize Para JWT capability when Para connects
 * 
 * This hook ensures Para's issueJwt function is ready by calling issueJwtAsync once.
 * Unlike useAutoParaJwtExchange, this doesn't exchange tokens - it just initializes
 * Para's JWT capability so the app can use direct Para JWT authentication.
 * 
 * Why needed: Para's issueJwt function isn't available until issueJwtAsync is called
 * once to complete biometric/OTP verification setup.
 * 
 * After initialization completes, triggers SWR cache refresh for user data.
 */
export function useInitParaJwt({
  paraConnected,
  paraAddress,
}: UseInitParaJwtProps) {
  const { issueJwtAsync } = useIssueJwt();
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check if we already have a valid JWT cached
    const hasValidCachedJwt = (() => {
      if (typeof window === 'undefined') return false;

      const memoryJwt = (window as any).__paraJwt;
      if (memoryJwt) {
        console.log('🔍 [PARA_JWT_INIT] Found cached JWT in memory');
        return true;
      }

      // Check localStorage for unexpired token
      const storedToken = localStorage.getItem('paraJwt');
      const storedExpiry = localStorage.getItem('paraJwtExpiry');

      if (storedToken && storedExpiry) {
        const expiryTimestamp = parseInt(storedExpiry);
        const now = Math.floor(Date.now() / 1000);
        const isValid = expiryTimestamp > now;
        console.log(`🔍 [PARA_JWT_INIT] Found JWT in localStorage, valid: ${isValid}`);
        return isValid;
      }

      return false;
    })();

    // If we have no cached JWT but the address is marked as initialized,
    // it means logout happened - clear the initialization flag
    if (!hasValidCachedJwt && paraAddress && hasInitializedRef.current.has(paraAddress)) {
      console.log('🧹 [PARA_JWT_INIT] No JWT but address marked as initialized, clearing flag');
      hasInitializedRef.current.delete(paraAddress);
    }

    const shouldInit =
      paraConnected &&
      paraAddress &&
      !isInitializingRef.current &&
      !hasInitializedRef.current.has(paraAddress) &&
      !hasValidCachedJwt; // Only init if we don't have a valid cached JWT

    console.log('🔍 [PARA_JWT_INIT] Check initialization:', {
      paraConnected,
      paraAddress,
      isInitializing: isInitializingRef.current,
      hasInitialized: paraAddress ? hasInitializedRef.current.has(paraAddress) : false,
      hasValidCachedJwt,
      shouldInit,
    });

    if (!shouldInit) {
      return;
    }

    const initializeParaJwt = async () => {
      // TypeScript guard: paraAddress is guaranteed to be non-null here due to shouldInit check
      if (!paraAddress) return;

      isInitializingRef.current = true;
      hasInitializedRef.current.add(paraAddress);

              try {
                console.log('🔑 [PARA_JWT_INIT] Initializing Para JWT capability for', paraAddress);
                
                // Call issueJwtAsync to initialize Para's JWT capability
                // This will prompt for biometric/OTP if needed
                // Note: __paraAddress is already set in useParaWallet when connected
                const result = await issueJwtAsync();
                
                const token = result?.token || result;
                
                if (!token || typeof token !== 'string') {
                  throw new Error('Invalid token format from Para');
                }
                
                console.log('✅ [PARA_JWT_INIT] Para JWT obtained successfully!');
                
                // Decode to get expiration
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiresAt = new Date(payload.exp * 1000);
                const ttl = Math.round((payload.exp - payload.iat) / 60);
                console.log(`🔑 [PARA_JWT_INIT] JWT expires in ${ttl} minutes (${expiresAt.toLocaleString()})`);
                
                // ✨ Store in localStorage for persistence across refreshes
                localStorage.setItem('paraJwt', token);
                localStorage.setItem('paraJwtExpiry', payload.exp.toString());
                
                // Also store in window for immediate use
                (window as any).__paraJwt = token;
                (window as any).__paraJwtIssueAsync = issueJwtAsync;
                
                console.log('✅ [PARA_JWT_INIT] Para JWT stored in localStorage - triggering data refresh');
                
                // Trigger SWR cache refresh for user data now that authentication is ready
                mutate('/api/auth/user-data');
                mutate('/api/auth/tickets');
              } catch (error) {
        console.error('❌ [PARA_JWT_INIT] Failed to initialize:', error);
        // Remove from cache so it can be retried
        hasInitializedRef.current.delete(paraAddress);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeParaJwt();
  }, [
    paraConnected,
    paraAddress,
    issueJwtAsync,
  ]);
}

