'use client';

import {
  useAppKit,
  useDisconnect,
  useAppKitProvider,
} from '@reown/appkit/react';
import { useSignMessage } from 'wagmi';
import {
  useLogout,
  useSignMessage as useParaSignMessage,
  useModal,
} from '@getpara/react-sdk';
import { toast } from 'sonner';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import { Button } from '@/components/ui/button';
import CustomConnect from '@/components/CustomConnect';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

import { verifySignature, truncateSignature } from '@/utils/signature';

export default function HomePage() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { signMessageAsync: paraSignMessageAsync, isPending: isParaSigning } =
    useParaSignMessage();
  const { openModal } = useModal();
  const { walletProvider } = useAppKitProvider('eip155');
  const { logoutAsync, isPending: isParaLoggingOut } = useLogout();

  // Unified connection status
  const { isConnected, address, connectionType, paraWalletData } =
    useUnifiedConnection();

  console.log('embeddedWalletInfo', walletProvider);
  console.log('Connection type:', connectionType);
  console.log('Unified connection status:', {
    isConnected,
    address,
    connectionType,
  });

  const handleDisconnect = async () => {
    try {
      // Check connection type and handle accordingly
      if (connectionType === 'para') {
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
        // Use regular disconnect for AppKit/Wagmi wallets
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

  const handleOpenAccountModal = () => {
    if (connectionType === 'para') {
      console.log('Opening Para account modal');
      openModal();
    } else {
      console.log('Opening AppKit account modal');
      open();
    }
  };

  const handleSign = async () => {
    if (!address) {
      console.error('No address available');
      toast.error('No address available');
      return;
    }

    console.log('Address:', address);
    console.log('Connection type:', connectionType);

    // Replace with your message
    const message = 'Hello, Devconnect!';

    try {
      let signature: string;

      if (connectionType === 'para' && paraWalletData?.id) {
        console.log('Using Para wallet for signing');
        const result = await paraSignMessageAsync({
          walletId: paraWalletData.id,
          messageBase64: btoa(message),
        });

        if ('signature' in result) {
          signature = result.signature;
          console.log('Para signature result:', signature);
        } else {
          throw new Error('Para signing was denied or failed');
        }
      } else {
        console.log('Using wagmi for wallet signing');
        signature = await signMessageAsync({
          message,
        });
        console.log('Wagmi signature result:', signature);
      }

      // Show notification with signature and verification
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
      <div className="max-w-md w-full">
        {!isConnected ? (
          <CustomConnect />
        ) : (
          <div className="bg-white p-4 space-y-4 rounded-lg">
            <div className="text-center">
              <p className="text-lg mb-2">Welcome!</p>
              <p className="text-sm text-gray-600 mb-4">Connected: {address}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSign}
                className="w-full"
                size="lg"
                disabled={isSigning || isParaSigning}
              >
                {isSigning || isParaSigning ? 'Signing...' : 'Sign Message'}
              </Button>
              <Button
                onClick={handleOpenAccountModal}
                // variant="outline"
                className="w-full"
                size="lg"
              >
                {connectionType === 'para'
                  ? 'Open Para Account'
                  : 'Open Account Modal'}
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

