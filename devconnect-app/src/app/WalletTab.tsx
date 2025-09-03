'use client';

import { useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function HomePage() {
  // Unified connection status - trust the unified hook completely
  const { isConnected, address, isPara } = useUnifiedConnection();

  // Only log significant connection changes to avoid spam
  const lastLoggedState = useRef<string | null>(null);
  useEffect(() => {
    const stateKey = `${isConnected}-${address}-${isPara}`;
    if (stateKey !== lastLoggedState.current) {
      console.log('🔗 [PAGE] Connection state:', {
        isConnected,
        hasAddress: !!address,
        isPara,
        address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : undefined
      });
      lastLoggedState.current = stateKey;
    }
  }, [isConnected, address, isPara]);

  return (
    <>
      {!isConnected || !address ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Onboarding />
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-white">
          <div className="w-full flex flex-col items-center py-8 pb-20 px-4">
            <div className="max-w-md w-full">
              <ConnectedWallet address={address} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
