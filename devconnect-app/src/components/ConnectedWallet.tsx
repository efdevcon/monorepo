'use client';

import { useAppKit, useDisconnect } from '@reown/appkit/react';
import { useSignMessage } from 'wagmi';
import { useLogout } from '@getpara/react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';

import { verifySignature, truncateSignature } from '@/utils/signature';

interface ConnectedWalletProps {
  address: string;
  connectionType: 'para' | 'wagmi' | 'appkit';
}

export default function ConnectedWallet({ address, connectionType }: ConnectedWalletProps) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { logoutAsync, isPending: isParaLoggingOut } = useLogout();

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
          <div className="space-y-2">
            <div className="font-semibold text-green-800">🔓 Successfully Disconnected</div>
            <div className="text-sm text-green-700">
              Para wallet logged out and disconnected from the application.
            </div>
          </div>,
          {
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }
        );
      } else {
        // Use regular disconnect for AppKit/Wagmi wallets
        console.log('Disconnecting from regular wallet');
        disconnect();
        toast.success(
          <div className="space-y-2">
            <div className="font-semibold text-green-800">🔓 Successfully Disconnected</div>
            <div className="text-sm text-green-700">
              Wallet disconnected from the application.
            </div>
          </div>,
          {
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }
        );
      }
    } catch (err) {
      console.error('Logout/Disconnect failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">❌ Disconnect Failed</div>
          <div className="text-sm text-red-700">
            <div className="font-medium">Error:</div>
            <div className="bg-red-50 p-2 rounded border text-red-600">
              {errorMessage}
            </div>
          </div>
        </div>,
        {
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    }
  };

  const handleOpenAccountModal = () => {
    // For Para wallet, we can't open a modal directly since it's connected through wagmi
    // For other wallets, use AppKit
    if (connectionType !== 'para') {
      console.log('Opening AppKit account modal');
      open();
    }
  };

  const handleSign = async () => {
    if (!address) {
      console.error('No address available');
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">⚠️ No Address Available</div>
          <div className="text-sm text-red-700">
            Please ensure your wallet is properly connected before signing messages.
          </div>
        </div>,
        {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      return;
    }

    console.log('Address:', address);
    console.log('Connection type:', connectionType);

    // Replace with your message
    const message = 'Hello, Devconnect!';

    try {
      console.log('Using wagmi for wallet signing');
      const signature = await signMessageAsync({
        message,
      });
      console.log('Wagmi signature result:', signature);

      // Show notification with signature and verification
      const isValidFormat = await verifySignature({
        address,
        message,
        signature,
      });
      const truncatedSig = truncateSignature(signature);

      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">✅ Message Signed Successfully!</div>
          <div className="text-sm text-green-700">
            <div className="font-medium">Signature:</div>
            <div className="font-mono text-xs bg-green-50 p-2 rounded border">
              {truncatedSig}
            </div>
          </div>
          <div className="text-sm">
            <span className={`font-medium ${isValidFormat ? 'text-green-700' : 'text-red-700'}`}>
              Verification: {isValidFormat ? '✅ Valid' : '❌ Invalid'}
            </span>
          </div>
        </div>,
        {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } catch (err) {
      console.error('Sign message failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">❌ Signing Failed</div>
          <div className="text-sm text-red-700">
            <div className="font-medium">Error:</div>
            <div className="bg-red-50 p-2 rounded border text-red-600">
              {errorMessage}
            </div>
          </div>
        </div>,
        {
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    }
  };

  return (
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
          disabled={isSigning}
        >
          {isSigning ? 'Signing...' : 'Sign Message'}
        </Button>
        <Button
          onClick={handleOpenAccountModal}
          className="w-full"
          size="lg"
          disabled={connectionType === 'para'}
        >
          {connectionType === 'para'
            ? 'Para Account Connected'
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
  );
} 
