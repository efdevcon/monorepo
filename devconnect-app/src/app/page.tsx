'use client';

import Onboarding from '@/components/Onboarding';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function HomePage() {
  // Unified connection status
  const { isConnected, address, isPara } = useUnifiedConnection();

  console.log('Is Para wallet:', isPara);
  console.log('Unified connection status:', {
    isConnected,
    address,
    isPara,
  });

  return (
    <>
      {!address ? (
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
              <ConnectedWallet address={address!} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

