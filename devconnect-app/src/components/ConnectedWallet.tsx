'use client';

import { useAppKit, useDisconnect } from '@reown/appkit/react';
import { useSignMessage } from 'wagmi';
import { useLogout, useModal } from '@getpara/react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import { useState, useRef } from 'react';

import { verifySignature, truncateSignature } from '@/utils/signature';

interface ConnectedWalletProps {
  address: string;
  isPara: boolean;
}

export default function ConnectedWallet({
  address,
  isPara,
}: ConnectedWalletProps) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { logoutAsync, isPending: isParaLoggingOut } = useLogout();
  const { openModal } = useModal();

  // State to track if we're waiting for user to sign
  const [isWaitingForSignature, setIsWaitingForSignature] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelRef = useRef<boolean>(false);

  const handleCancelSigning = () => {
    // Set the cancel flag to stop the signing process
    cancelRef.current = true;

    // Clear the UI state immediately
    setIsWaitingForSignature(false);
    toast.dismiss('signing-pending');

    // Abort the signing process if we have an abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleDisconnect = async () => {
    try {
      // Check connection type and handle accordingly
      if (isPara) {
        console.log('Logging out from Para wallet');
        await logoutAsync({
          clearPregenWallets: false, // Keep pre-generated wallets
        });
        console.log('Para logout completed, now disconnecting');
        disconnect();
        toast.success(
          <div className="space-y-2">
            <div className="font-semibold text-green-800">
              🔓 Successfully Disconnected
            </div>
            <div className="text-sm text-green-700">
              Para wallet logged out and disconnected from the application.
            </div>
          </div>,
          {
            duration: 4000,
            dismissible: true,
            closeButton: true,
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
            <div className="font-semibold text-green-800">
              🔓 Successfully Disconnected
            </div>
            <div className="text-sm text-green-700">
              Wallet disconnected from the application.
            </div>
          </div>,
          {
            duration: 4000,
            dismissible: true,
            closeButton: true,
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
          dismissible: true,
          closeButton: true,
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
    if (isPara) {
      console.log('Opening Para account modal');
      openModal();
    } else {
      // Use AppKit for other wallets
      console.log('Opening AppKit account modal');
      open();
    }
  };

  const handleSign = async () => {
    if (!address) {
      console.error('No address available');
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ⚠️ No Address Available
          </div>
          <div className="text-sm text-red-700">
            Please ensure your wallet is properly connected before signing
            messages.
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
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
    console.log('Is Para wallet:', isPara);

    // Replace with your message
    const message = 'Hello, Devconnect!';

    try {
      console.log('Using wagmi for wallet signing');

      // Only show interactive toast for non-Para wallets
      if (!isPara) {
        // Reset cancel flag and set up abort controller for cancellation
        cancelRef.current = false;
        abortControllerRef.current = new AbortController();
        setIsWaitingForSignature(true);

        // Show pending toast with cancel option
        toast.info(
          <div className="space-y-3">
            <div className="font-semibold text-blue-800">
              🔐 Waiting for Signature
            </div>
            <div className="text-sm text-blue-700">
              Please check your wallet and approve the signature request.
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelSigning}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>,
          {
            id: 'signing-pending',
            duration: Infinity, // Don't auto-dismiss
            dismissible: false,
            closeButton: false,
            style: {
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }
        );
      }

      // Start the signing process with cancellation check
      const signature = await signMessageAsync({ message });

      // Check if the process was cancelled
      if (!isPara && cancelRef.current) {
        throw new Error('Signing cancelled by user');
      }

      // Clear the pending state (only if we set it)
      if (!isPara) {
        setIsWaitingForSignature(false);
        abortControllerRef.current = null;
        toast.dismiss('signing-pending');

        // If cancelled, don't proceed with success flow
        if (cancelRef.current) {
          return;
        }
      }

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
          <div className="font-semibold text-green-800">
            ✅ Message Signed Successfully!
          </div>
          <div className="text-sm text-green-700">
            <div className="font-medium">Signature:</div>
            <div className="font-mono text-xs bg-green-50 p-2 rounded border">
              {truncatedSig}
            </div>
          </div>
          <div className="text-sm">
            <span
              className={`font-medium ${isValidFormat ? 'text-green-700' : 'text-red-700'}`}
            >
              Verification: {isValidFormat ? '✅ Valid' : '❌ Invalid'}
            </span>
          </div>
        </div>,
        {
          duration: 5000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } catch (err) {
      // Clear the pending state (only if we set it for non-Para wallets)
      if (!isPara) {
        setIsWaitingForSignature(false);
        abortControllerRef.current = null;
        toast.dismiss('signing-pending');
      }

      console.error('Sign message failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Don't show error toast if user cancelled (only for non-Para wallets)
      if (
        !isPara &&
        (errorMessage.includes('aborted') ||
          errorMessage.includes('cancelled') ||
          errorMessage.includes('Signing cancelled by user'))
      ) {
        toast.info(
          <div className="space-y-2">
            <div className="font-semibold text-blue-800">
              ℹ️ Signing Cancelled
            </div>
            <div className="text-sm text-blue-700">
              The signature request was cancelled.
            </div>
          </div>,
          {
            duration: 3000,
            dismissible: true,
            closeButton: true,
            style: {
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }
        );
        return;
      }

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
          dismissible: true,
          closeButton: true,
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
          disabled={
            isPara
              ? isSigning
              : isWaitingForSignature || (isSigning && !cancelRef.current)
          }
        >
          {isPara
            ? isSigning
              ? 'Signing...'
              : 'Sign Message'
            : isWaitingForSignature
              ? 'Waiting for Signature...'
              : 'Sign Message'}
        </Button>
        <Button onClick={handleOpenAccountModal} className="w-full" size="lg">
          {isPara
            ? 'Open Para Account Modal'
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
