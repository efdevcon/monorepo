'use client';

import Onboarding from '@/components/Onboarding';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function HomePage() {
  // Unified connection status
  const { isConnected, address, isPara, wagmiAccount } = useUnifiedConnection();

  console.log('Is Para wallet:', isPara);
  console.log('Unified connection status:', {
    isConnected,
    address,
    isPara,
  });

  // More stable condition: check if we have a wagmi connection OR if we're connected
  // This prevents showing Onboarding during connection restoration
  const hasConnection = address || (wagmiAccount.isConnected && wagmiAccount.address);
  
  // Show loading during initial connection check (when wagmi is still connecting/reconnecting)
  const isInitializing = wagmiAccount.isConnecting || wagmiAccount.isReconnecting;

  // Show loading state during initialization to prevent component switching
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="m-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hasConnection ? (
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
              <ConnectedWallet address={address || wagmiAccount.address!} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

