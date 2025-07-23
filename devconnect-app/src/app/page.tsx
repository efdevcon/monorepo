'use client';

import { useAppKitProvider } from '@reown/appkit/react';
import CustomConnect from '@/components/CustomConnect';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function HomePage() {
  const { walletProvider } = useAppKitProvider('eip155');

  // Unified connection status
  const { isConnected, address, isPara } = useUnifiedConnection();

  console.log('walletProvider', walletProvider);
  console.log('Is Para wallet:', isPara);
  console.log('Unified connection status:', {
    isConnected,
    address,
    isPara,
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        {!isConnected ? (
          <div className="m-6">
            <CustomConnect />
          </div>
        ) : (
          <ConnectedWallet address={address!} isPara={isPara} />
        )}
      </div>
    </div>
  );
}

