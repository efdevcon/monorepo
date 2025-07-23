'use client';

import { useAppKitProvider } from '@reown/appkit/react';
import CustomConnect from '@/components/CustomConnect';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function HomePage() {
  const { walletProvider } = useAppKitProvider('eip155');

  // Unified connection status
  const { isConnected, address, connectionType } = useUnifiedConnection();

  console.log('embeddedWalletInfo', walletProvider);
  console.log('Connection type:', connectionType);
  console.log('Unified connection status:', {
    isConnected,
    address,
    connectionType,
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        {!isConnected ? (
          <div className="m-6">
            <CustomConnect />
          </div>
        ) : (
          <ConnectedWallet
            address={address!}
            connectionType={connectionType as 'para' | 'wagmi' | 'appkit'}
          />
        )}
      </div>
    </div>
  );
}

