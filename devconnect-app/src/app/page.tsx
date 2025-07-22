'use client';

import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
  useAppKitProvider,
} from '@reown/appkit/react';
import { useSignMessage } from 'wagmi';
import { useLogout } from '@getpara/react-sdk';
import { toast } from 'sonner';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import { Button } from '@/components/ui/button';

import { verifySignature, truncateSignature } from '@/utils/signature';
import { APP_NAME, APP_DESCRIPTION } from '@/config/config';

export default function HomePage() {
  const { open } = useAppKit();
  const { isConnected, address } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { walletProvider } = useAppKitProvider('eip155');
  const { logoutAsync, isPending: isParaLoggingOut } = useLogout();
  console.log('embeddedWalletInfo', walletProvider);

  const handleDisconnect = async () => {
    try {
      // Check if the wallet is Para
      if (
        walletProvider &&
        typeof walletProvider === 'object' &&
        'para' in walletProvider
      ) {
        console.log('Logging out from Para wallet');
        await logoutAsync({
          clearPregenWallets: false, // Keep pre-generated wallets
        });
        console.log('Para logout completed, now disconnecting');
        disconnect();
        toast.success(
          'Successfully logged out from Para wallet and disconnected'
        );
      } else {
        // Use regular disconnect for other wallets
        console.log('Disconnecting from regular wallet');
        disconnect();
        toast.success('Successfully disconnected');
      }
    } catch (err) {
      console.error('Logout/Disconnect failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Logout failed: ${errorMessage}`);
    }
  };

  const handleSign = async () => {
    if (!address) {
      console.error('No address available');
      toast.error('No address available');
      return;
    }

    console.log('Address:', address);

    // Replace with your message
    const message = 'Hello, Devconnect!';

    try {
      console.log('Using wagmi for wallet signing');

      const result = await signMessageAsync({
        message,
      });

      console.log('Wagmi signature result:', result);

      // Show notification with signature and verification
      const signature = result;
      const isValidFormat = await verifySignature({
        address,
        message,
        signature,
      });
      const truncatedSig = truncateSignature(signature);

      toast.success(
        `Signature: ${truncatedSig}\nIs valid: ${isValidFormat ? '✓' : '✗'}`
      );
    } catch (err) {
      console.error('Sign message failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Signing failed: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg text-white max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">{APP_NAME}</h1>
        <p className="text-center text-gray-300 mb-6">{APP_DESCRIPTION}</p>

        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-center text-gray-300 mb-4">
              Connect your wallet to get started
            </p>
            <Button onClick={() => open()} className="w-full" size="lg">
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg mb-2">Welcome!</p>
              <p className="text-sm text-gray-300 mb-4">Connected: {address}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSign}
                className="w-full"
                size="lg"
                disabled={isSigning}
              >
                {isSigning ? 'Signing...' : 'Sign Message'}
              </Button>
              <Button
                onClick={() => open()}
                // variant="outline"
                className="w-full"
                size="lg"
              >
                Open Account Modal
              </Button>
              {address && (
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isParaLoggingOut}
                >
                  {isParaLoggingOut ? 'Logging out...' : 'Disconnect'}
                </Button>
              )}
              {address && <Zkp2pOnrampQRCode address={address} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

