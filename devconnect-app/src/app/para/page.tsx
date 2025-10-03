'use client';

import { useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import ConnectedWallet from '@/components/ConnectedWallet';
import ParaIntegration from '@/components/ParaIntegration';
import { useWalletManager } from '@/hooks/useWalletManager';

export default function HomePage() {
  // Unified connection status - trust the unified hook completely
  const { isConnected, address, isPara } = useWalletManager();

  // Only log significant connection changes to avoid spam
  const lastLoggedState = useRef<string | null>(null);
  useEffect(() => {
    const stateKey = `${isConnected}-${address}-${isPara}`;
    if (stateKey !== lastLoggedState.current) {
      console.log('🔗 [PAGE] Connection state:', {
        isConnected,
        hasAddress: !!address,
        isPara,
        address: address
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : undefined,
      });
      lastLoggedState.current = stateKey;
    }
  }, [isConnected, address, isPara]);

  return (
    <>
      <ParaIntegration
        address={address}
        isPara={isPara}
        onConnect={() => {
          console.log('Para integration connected');
        }}
      />
    </>
  );
}
