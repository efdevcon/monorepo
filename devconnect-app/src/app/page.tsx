'use client';

import { useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function HomePage() {
  // Unified connection status - trust the unified hook completely
  const { isConnected, address, isPara } = useUnifiedConnection();

  // Reduced logging - only log when connection state actually changes
  const prevConnectionState = useRef<{
    isConnected: boolean;
    address: string | undefined;
    isPara: boolean;
  }>({
    isConnected: false,
    address: undefined,
    isPara: false,
  });
  useEffect(() => {
    const currentState = { isConnected, address, isPara };
    const hasChanged =
      JSON.stringify(currentState) !==
      JSON.stringify(prevConnectionState.current);

    if (hasChanged) {
      console.log('🔗 [PAGE] Connection state changed:', currentState);
      prevConnectionState.current = currentState;
    }
  }, [isConnected, address, isPara]);

  return (
    <>
      {!isConnected || !address ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="m-6">
              <Onboarding />
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-white w-full absolute top-0 left-0">
          <div className="w-full flex flex-col items-center py-8 pb-20">
            <div className="max-w-md w-full">
              <ConnectedWallet address={address} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

