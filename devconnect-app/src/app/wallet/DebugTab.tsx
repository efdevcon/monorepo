'use client';

import { useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import ConnectedWallet from '@/components/ConnectedWallet';
import { useWallet } from '@/context/WalletContext';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

export default function DebugTab() {
  // Unified connection status - trust the unified hook completely
  const { isConnected, address, isPara } = useWallet();
  const { user } = useUser();
  const router = useRouter();

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

  useEffect(() => {
    console.log('🔄 [ONBOARDING] Connection status:', address);
    if (
      typeof window !== 'undefined' &&
      window.location.pathname === '/onboarding' &&
      address
    ) {
      console.log('🔄 [ONBOARDING] Redirecting to wallet');
      router.push('/wallet');
    }
  }, [address]);

  return (
    <>
      {!address ? (
        <div
          className="min-h-screen h-full flex items-center justify-center p-4 grow "
          style={{
            backgroundImage: `url('${process.env.NEXT_PUBLIC_APP_URL}/images/midj-epic-city3.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
          }}
        >
          <div className="max-w-md w-full">
            <Onboarding />
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center py-8 pb-20 px-4">
          <div className="max-w-md w-full">
            <ConnectedWallet />
          </div>
        </div>
      )}
    </>
  );
}
