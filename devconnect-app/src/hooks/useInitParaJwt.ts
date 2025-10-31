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
    const shouldInit =
      paraConnected &&
      paraAddress &&
      !isInitializingRef.current &&
      !hasInitializedRef.current.has(paraAddress) &&
      // Check if issueJwt is NOT already available
      typeof (window as any).para?.issueJwt !== 'function';

    if (!shouldInit) {
      return;
    }

    const initializeParaJwt = async () => {
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
                
                // Store the JWT in window for authService to use
                // This is a simple way to make it available outside React context
                (window as any).__paraJwt = token;
                (window as any).__paraJwtIssueAsync = issueJwtAsync;
                
                console.log('✅ [PARA_JWT_INIT] Para JWT stored - triggering data refresh');
                
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

