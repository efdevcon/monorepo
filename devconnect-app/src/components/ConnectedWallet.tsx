'use client';

import {
  useAppKit,
  useDisconnect as useAppKitDisconnect,
} from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { useSignMessage } from 'wagmi';
import { ModalStep, useLogout, useModal } from '@getpara/react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import CoinbaseOnrampButton from '@/components/CoinbaseOnrampButton';
import CoinbaseOneClickBuyButton from '@/components/CoinbaseOneClickBuyButton';
import RipioOnrampButton from '@/components/RipioOnrampButton';
import { useState, useRef } from 'react';

import { verifySignature, truncateSignature } from '@/utils/signature';
import LinkTicket from './LinkTicket';
import PortfolioModal from './PortfolioModal';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { ZupassProvider } from '@/context/ZupassProvider';

interface ConnectedWalletProps {
  address: string;
  isPara: boolean;
}

export default function ConnectedWallet({
  address,
  isPara,
}: ConnectedWalletProps) {
  const { open } = useAppKit();
  const { disconnect: appKitDisconnect } = useAppKitDisconnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { logoutAsync, isPending: isParaLoggingOut } = useLogout();
  const { openModal } = useModal();

  // Unified connection hook for Para SDK integration
  const {
    ensureWagmiConnection,
    isFullyConnected,
    siweState,
    siweEnabled,
    handleSiweSignIn,
    handleSignMessage: hookSignMessage,
    disconnect: hookDisconnect,
    recoverParaConnection,
    paraSDKConnected,
    wagmiParaConnected,
  } = useUnifiedConnection();

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
        wagmiDisconnect();
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
        // Use AppKit disconnect for AppKit wallets, wagmi disconnect for others
        console.log('Disconnecting from regular wallet');
        appKitDisconnect();
        wagmiDisconnect();
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

  const handleShowRecoverySecret = () => {
    if (isPara) {
      console.log('Opening Para recovery secret modal');
      openModal({ step: ModalStep.SECRET });
    }
  };

  const handleShowAddFunds = () => {
    if (isPara) {
      console.log('Opening Para add funds modal');
      openModal({ step: ModalStep.ADD_FUNDS_BUY });
    }
  };

  const handleShowMoonPayAddFunds = () => {
    // MoonPay integration URL with dynamic wallet address
    const currentDomain = window.location.origin;
    const moonPayUrl = `https://buy-sandbox.moonpay.com/?apiKey=pk_test_oxQY1qdAGKlItZrVIRQ9qpNwpfAPHjQ&theme=dark&defaultCurrencyCode=usdc&baseCurrencyAmount=20&colorCode=%237d01ff&walletAddress=${address}&redirectURL=${encodeURIComponent(currentDomain + '/onramp?type=moonpay&confirm=true')}`;

    console.log('Opening MoonPay onramp:', moonPayUrl);

    // Open MoonPay in a new window/tab
    window.open(moonPayUrl, '_blank', 'noopener,noreferrer');

    toast.info(
      <div className="space-y-2">
        <div className="font-semibold text-blue-800">
          🌙 MoonPay Onramp Opened
        </div>
        <div className="text-sm text-blue-700">
          MoonPay has been opened in a new tab. Complete your purchase to add
          funds to your wallet.
        </div>
      </div>,
      {
        duration: 4000,
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
  };

  const handleShowTransakAddFunds = () => {
    // Transak integration URL with dynamic wallet address
    const currentDomain = window.location.origin;
    const transakUrl = `https://global-stg.transak.com/?environment=STAGING&defaultFiatAmount=5&defaultFiatCurrency=USD&defaultCryptoCurrency=USDC&network=ethereum&walletAddress=${address}&redirectURL=${encodeURIComponent(currentDomain + '/onramp?type=transak&confirm=true')}&productsAvailed=BUY&theme=dark&colorMode=DARK`;

    console.log('Opening Transak onramp:', transakUrl);

    // Open Transak in a new window/tab
    window.open(transakUrl, '_blank', 'noopener,noreferrer');

    toast.info(
      <div className="space-y-2">
        <div className="font-semibold text-blue-800">
          🔄 Transak Onramp Opened
        </div>
        <div className="text-sm text-blue-700">
          Transak has been opened in a new tab. Complete your purchase to add
          funds to your wallet.
        </div>
      </div>,
      {
        duration: 4000,
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

      // Ensure wagmi is connected if using Para SDK
      if (isPara) {
        await ensureWagmiConnection();
      }

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
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors cursor-pointer"
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

  // Handle SIWE verification
  const handleSiweVerification = async () => {
    try {
      const success = await handleSiweSignIn();
      if (success) {
        toast.success(
          <div className="space-y-2">
            <div className="font-semibold text-green-800">
              ✅ SIWE Verification Successful!
            </div>
            <div className="text-sm text-green-700">
              Your wallet has been verified with Sign-In with Ethereum.
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
        toast.error(
          <div className="space-y-2">
            <div className="font-semibold text-red-800">
              ❌ SIWE Verification Failed
            </div>
            <div className="text-sm text-red-700">
              Please try again or check your wallet connection.
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
      }
    } catch (error) {
      console.error('SIWE verification failed:', error);
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ SIWE Verification Error
          </div>
          <div className="text-sm text-red-700">
            An unexpected error occurred during verification.
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
    }
  };

  return (
    <div className="bg-white p-4 space-y-4 rounded-lg">
      <div className="text-center">
        <p className="text-lg mb-2">Welcome!</p>
        <p className="text-sm text-gray-600 mb-4">Connected: {address}</p>

        {/* Connection Status */}
        <div className="text-xs text-gray-500 mb-2">
          <div>Connection Type: {isPara ? 'Para' : 'Standard'}</div>
          <div>Fully Connected: {isFullyConnected ? '✅ Yes' : '❌ No'}</div>
          {siweEnabled && (
            <div>
              SIWE Status:{' '}
              {siweState === 'success'
                ? '✅ Verified'
                : siweState === 'signing'
                  ? '⏳ Signing...'
                  : siweState === 'error'
                    ? '❌ Failed'
                    : '⏸️ Pending'}
            </div>
          )}
          {/* Debug information for Para connections */}
          {isPara && (
            <>
              <div>
                Para SDK:{' '}
                {paraSDKConnected ? '✅ Connected' : '❌ Disconnected'}
              </div>
              <div>
                Wagmi Para:{' '}
                {wagmiParaConnected ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* <ZupassProvider>
          <LinkTicket className="mb-2" />
        </ZupassProvider> */}

        {/* SIWE Verification Button (only show if SIWE is enabled and not verified) */}
        {siweEnabled && siweState !== 'success' && (
          <Button
            onClick={handleSiweVerification}
            className="w-full cursor-pointer"
            size="lg"
            variant={siweState === 'error' ? 'destructive' : 'default'}
            disabled={siweState === 'signing'}
          >
            {siweState === 'signing'
              ? 'Signing SIWE Message...'
              : siweState === 'error'
                ? '❌ SIWE Failed - Try Again'
                : '🔐 Complete Sign-In with Ethereum'}
          </Button>
        )}

        <Button
          onClick={handleSign}
          className="w-full cursor-pointer"
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

        <Button
          onClick={handleOpenAccountModal}
          className="w-full cursor-pointer"
          size="lg"
        >
          {isPara ? 'Open Para Account Modal' : 'Open Account Modal'}
        </Button>

        {/* Show Recovery Secret button - only for Para wallets */}
        {isPara && (
          <Button
            onClick={handleShowRecoverySecret}
            className="w-full cursor-pointer"
            size="lg"
            variant="outline"
          >
            🔐 Show Recovery Secret
          </Button>
        )}

        {/* Show Add Funds button - only for Para wallets */}
        {isPara && (
          <Button
            onClick={handleShowAddFunds}
            className="w-full cursor-pointer"
            size="lg"
            variant="outline"
          >
            💰 Add Funds with Para
          </Button>
        )}

        <div className="flex flex-row gap-2 items-center">
          <Button
            onClick={handleShowMoonPayAddFunds}
            className="cursor-pointer"
            size="lg"
            variant="outline"
          >
            💰 Add Funds with Moonpay
          </Button>
          <a
            href="https://dev.moonpay.com/v1.0/docs/credit-cards-testing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            staging details
          </a>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <Button
            onClick={handleShowTransakAddFunds}
            className="cursor-pointer"
            size="lg"
            variant="outline"
          >
            🔄 Add Funds with Transak
          </Button>
          <a
            href="https://docs.transak.com/docs/test-credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            staging details
          </a>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <RipioOnrampButton
            address={address}
            className="cursor-pointer"
            size="lg"
            variant="outline"
          >
            🚀 Add Funds with Ripio
          </RipioOnrampButton>
          <a
            href="https://b2b-widget-onramp.sandbox.ripio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            sandbox
          </a>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <CoinbaseOnrampButton
            address={address}
            className="cursor-pointer"
            size="lg"
            w="100%"
          />
          ‼️ [PROD]
          <a
            href="https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-onramp-url"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            docs
          </a>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <CoinbaseOneClickBuyButton
            address={address}
            presetCryptoAmount={1}
            defaultAsset="USDC"
            className="cursor-pointer"
            size="lg"
            w="100%"
          />
          ‼️ [PROD]
          <a
            href="https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/one-click-buy-url"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            docs
          </a>
        </div>

        {/* Debug button for connection issues */}
        {!isPara && (paraSDKConnected || wagmiParaConnected) && (
          <Button
            onClick={async () => {
              console.log('Connection debug info:', {
                isPara,
                paraSDKConnected,
                wagmiParaConnected,
                address,
              });
              await recoverParaConnection();
            }}
            className="w-full cursor-pointer"
            size="lg"
            variant="secondary"
          >
            🔧 Fix Para Detection
          </Button>
        )}

        {address && <PortfolioModal address={address} />}

        {address && (
          <Button
            variant="destructive"
            className="w-full cursor-pointer"
            onClick={handleDisconnect}
            disabled={isParaLoggingOut}
          >
            {isParaLoggingOut ? 'Logging out...' : 'Disconnect'}
          </Button>
        )}

        {address && <Zkp2pOnrampQRCode address={address} />}
        <a href="/map" className="text-sm text-blue-500 m-auto">
          Fullscreen Map
        </a>
      </div>
    </div>
  );
} 
