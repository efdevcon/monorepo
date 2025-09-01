'use client';

import {
  useAppKit,
  useDisconnect as useAppKitDisconnect,
} from '@reown/appkit/react';
import { useSignMessage } from 'wagmi';
import { ModalStep, useLogout, useModal } from '@getpara/react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import CoinbaseOnrampButton from '@/components/CoinbaseOnrampButton';
import CoinbaseOneClickBuyButton from '@/components/CoinbaseOneClickBuyButton';
import RipioOnrampButton from '@/components/RipioOnrampButton';
import { useState, useRef } from 'react';
import { useAccount, useConnect, useSwitchAccount } from 'wagmi';
import { appKit } from '@/config/appkit';
import { useConnectorClient } from 'wagmi';

import { verifySignature, truncateSignature } from '@/utils/signature';
import LinkTicket from './LinkTicket';
import PortfolioModal from './PortfolioModal';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { ZupassProvider } from '@/context/ZupassProvider';

// Toast utility functions to reduce overload and improve UX
const showSuccessToast = (title: string, message?: string, duration = 3000) => {
  toast.success(
    <div className="space-y-1">
      <div className="font-semibold text-green-800">{title}</div>
      {message && <div className="text-sm text-green-700">{message}</div>}
    </div>,
    {
      duration,
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
};

const showErrorToast = (title: string, message?: string, duration = 4000) => {
  toast.error(
    <div className="space-y-1">
      <div className="font-semibold text-red-800">{title}</div>
      {message && <div className="text-sm text-red-700">{message}</div>}
    </div>,
    {
      duration,
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
};

const showInfoToast = (title: string, message?: string, duration = 3000) => {
  toast.info(
    <div className="space-y-1">
      <div className="font-semibold text-blue-800">{title}</div>
      {message && <div className="text-sm text-blue-700">{message}</div>}
    </div>,
    {
      duration,
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

interface ConnectedWalletProps {
  address: string;
}

export default function ConnectedWallet({ address }: ConnectedWalletProps) {
  const { open } = useAppKit();
  const { signMessageAsync, isPending: wagmiIsSigning } = useSignMessage();
  const { logoutAsync, isPending: isParaLoggingOut } = useLogout();
  const { openModal } = useModal();

  // Unified connection hook for Para SDK integration
  const {
    isConnected,
    address: hookAddress,
    isPara,
    wagmiAccount,
    isWagmiConnected,
    paraAccount,
    paraWallet,
    isParaConnected,
    connectors,
    switchableConnectors,
    paraConnector,
    primaryConnector,
    primaryConnectorId,
    switchPrimaryConnector,
    handleSwitchAccount,
    handleConnectToWallet: hookConnectToWallet,
    handleSignMessage: hookSignMessage,
    isSigning,
    siweState,
    siweEnabled,
    handleSiweSignIn,
    disconnect: hookDisconnect,
    ensureParaWagmiConnection,
    paraEmail,
  } = useUnifiedConnection();

  // Simplified signing state management
  const [signingState, setSigningState] = useState<
    'idle' | 'waiting' | 'signing' | 'completed' | 'cancelled' | 'error'
  >('idle');
  const signingControllerRef = useRef<{
    abortController: AbortController | null;
    cancelled: boolean;
  }>({
    abortController: null,
    cancelled: false,
  });

  const resetSigningState = () => {
    setSigningState('idle');
    signingControllerRef.current = {
      abortController: null,
      cancelled: false,
    };
    toast.dismiss('signing-pending');
  };

  const handleCancelSigning = () => {
    console.log('🔏 [SIGNING] User cancelled signing process');

    // Mark as cancelled
    signingControllerRef.current.cancelled = true;
    setSigningState('cancelled');

    // Abort any ongoing operations
    if (signingControllerRef.current.abortController) {
      signingControllerRef.current.abortController.abort();
    }

    // Clean up UI state
    toast.dismiss('signing-pending');

    // Reset after a short delay
    setTimeout(resetSigningState, 1000);
  };

  const handleConnectToWallet = async (connector: any) => {
    try {
      console.log('Connecting to wallet:', connector);

      // If we're currently connected to Para and trying to connect to a different wallet,
      // we need to disconnect first and then connect to the new wallet
      if (isPara && connector.id !== 'para' && connector.id !== 'getpara') {
        console.log('Disconnecting from Para to connect to:', connector.name);

        // Show connecting toast
        toast.info(
          <div className="space-y-2">
            <div className="font-semibold text-blue-800">
              🔄 Switching Wallets
            </div>
            <div className="text-sm text-blue-700">
              Disconnecting from Para and connecting to {connector.name}...
            </div>
          </div>,
          {
            duration: 3000,
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

        // Disconnect from current Para connection (without showing success toast)
        await handleDisconnectSilently();

        // Longer delay to ensure disconnection is complete
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Use the unified connection hook's function to connect
      const success = await hookConnectToWallet(connector);

      if (success) {
        showSuccessToast(
          '✅ Connected Successfully',
          `Connected to ${connector.name}`
        );
      }
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      showErrorToast(
        '❌ Connection Failed',
        `Failed to connect to ${connector.name}`
      );
    }
  };

  const handleDisconnectSilently = async () => {
    try {
      console.log(
        '🔌 [SILENT_DISCONNECT] Starting silent disconnect process, isPara:',
        isPara
      );

      // Handle Para logout first if needed
      if (isPara) {
        console.log(
          '🔌 [SILENT_DISCONNECT] Silently logging out from Para wallet'
        );
        await logoutAsync({
          clearPregenWallets: false, // Keep pre-generated wallets
        });
        console.log('🔌 [SILENT_DISCONNECT] Para logout completed');
      }

      // Use the unified disconnect function which handles all cleanup
      await hookDisconnect();

      console.log('🔌 [SILENT_DISCONNECT] Silent disconnect completed');
    } catch (err) {
      console.error('🔌 [SILENT_DISCONNECT] Silent disconnect failed:', err);
      throw err;
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log(
        '🔌 [DISCONNECT] Starting disconnect process, isPara:',
        isPara
      );

      // Handle Para logout first if needed
      if (isPara) {
        console.log('🔌 [DISCONNECT] Logging out from Para wallet first');
        await logoutAsync({
          clearPregenWallets: false, // Keep pre-generated wallets
        });
        console.log('🔌 [DISCONNECT] Para logout completed');
      }

      // Use the unified disconnect function which handles all cleanup
      await hookDisconnect();

      // Show simple success toast
      showSuccessToast('🔓 Disconnected', 'Wallet disconnected successfully');
    } catch (err) {
      console.error('🔌 [DISCONNECT] Disconnect failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showErrorToast('❌ Disconnect Failed', errorMessage);
    }
  };

  const handleOpenAccountModal = () => {
    if (isPara) {
      console.log('Opening Para account modal');
      openModal();
      // openModal({ step: ModalStep.EX_WALLET_MORE });
      // open({ view: 'Account' });
      // openModal({ step: ModalStep.ADD_FUNDS_BUY });
      // open({ view: 'Connect' });
    } else {
      // Use AppKit for other wallets
      console.log('Opening AppKit account modal');
      // openModal();
      // openModal({ step: ModalStep.ADD_FUNDS_BUY });
      // open({ view: 'OnRampProviders' });
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

    showInfoToast('🌙 MoonPay Opened', 'Complete your purchase in the new tab');
  };

  const handleShowTransakAddFunds = () => {
    // Transak integration URL with dynamic wallet address
    const currentDomain = window.location.origin;
    const transakUrl = `https://global-stg.transak.com/?environment=STAGING&defaultFiatAmount=5&defaultFiatCurrency=USD&defaultCryptoCurrency=USDC&network=ethereum&walletAddress=${address}&redirectURL=${encodeURIComponent(currentDomain + '/onramp?type=transak&confirm=true')}&productsAvailed=BUY&theme=dark&colorMode=DARK`;

    console.log('Opening Transak onramp:', transakUrl);

    // Open Transak in a new window/tab
    window.open(transakUrl, '_blank', 'noopener,noreferrer');

    showInfoToast('🔄 Transak Opened', 'Complete your purchase in the new tab');
  };

  const handleSign = async () => {
    if (!address) {
      console.error('🔏 [SIGNING] No address available');
      toast.error(
        'Please ensure your wallet is properly connected before signing messages.'
      );
      return;
    }

    if (signingState !== 'idle') {
      console.warn('🔏 [SIGNING] Signing already in progress:', signingState);
      return;
    }

    const message = 'Hello, Devconnect!';

    try {
      console.log('🔏 [SIGNING] Starting signing process with:', {
        address,
        primaryConnectorId,
        isPara,
        message: message.substring(0, 50) + '...',
      });

      setSigningState('waiting');

      // Setup abort controller for cancellation
      signingControllerRef.current.abortController = new AbortController();

      // Show pending toast for non-Para wallets
      if (!isPara) {
        toast.info(
          <div className="space-y-3">
            <div className="font-semibold text-blue-800">
              🔐 Waiting for Signature
            </div>
            <div className="text-sm text-blue-700">
              Please check your wallet and approve the signature request.
            </div>
            <button
              onClick={handleCancelSigning}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>,
          {
            id: 'signing-pending',
            duration: Infinity,
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

      // Check for cancellation before starting
      if (signingControllerRef.current.cancelled) {
        throw new Error('Signing cancelled by user');
      }

      setSigningState('signing');

      // Perform the signing
      let signature;
      if (primaryConnector) {
        console.log(
          '🔏 [SIGNING] Using primary connector:',
          primaryConnector.id
        );
        signature = await signMessageAsync({
          message,
          connector: primaryConnector,
        });
      } else {
        console.log('🔏 [SIGNING] No primary connector, using default');
        signature = await signMessageAsync({ message });
      }

      // Check if cancelled during signing
      if (signingControllerRef.current.cancelled) {
        throw new Error('Signing cancelled by user');
      }

      setSigningState('completed');

      // Verify signature
      const isValidFormat = await verifySignature({
        address,
        message,
        signature,
      });
      const truncatedSig = truncateSignature(signature);

      console.log('🔏 [SIGNING] Signing completed successfully:', {
        valid: isValidFormat,
        signatureLength: signature.length,
      });

      // Show success toast
      showSuccessToast(
        '✅ Message Signed!',
        `Using ${primaryConnector?.name || 'wallet'}`,
        3000
      );

      // Reset state after success
      setTimeout(resetSigningState, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('🔏 [SIGNING] Signing failed:', errorMessage);

      // Handle cancellation vs actual errors
      if (
        signingControllerRef.current.cancelled ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('aborted')
      ) {
        setSigningState('cancelled');
        toast.info('ℹ️ Signing Cancelled', { duration: 3000 });
      } else {
        setSigningState('error');
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

      // Reset state after error
      setTimeout(resetSigningState, 2000);
    }
  };

  // Handle SIWE verification
  const handleSiweVerification = async () => {
    try {
      const success = await handleSiweSignIn();
      if (success) {
        showSuccessToast(
          '✅ SIWE Verified',
          'Sign-In with Ethereum successful'
        );
      } else {
        showErrorToast(
          '❌ SIWE Failed',
          'Please try again or check your wallet'
        );
      }
    } catch (error) {
      console.error('SIWE verification failed:', error);
      showErrorToast('❌ SIWE Error', 'An unexpected error occurred');
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
          <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
          {primaryConnectorId && (
            <div className="text-green-600 font-medium">
              Primary Connector: {primaryConnector?.name || primaryConnectorId}
            </div>
          )}
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
                Para SDK: {isParaConnected ? '✅ Connected' : '❌ Disconnected'}
              </div>
              <div>
                Wagmi Para:{' '}
                {isWagmiConnected ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </>
          )}
          {paraEmail && <div>Email: {paraEmail}</div>}
          {/* <div>
            Wagmi accounts:{' '}
            {JSON.stringify(connectors?.map((connector) => connector.address))}
          </div> */}
        </div>

        {/* Switch Account Section */}
        {switchableConnectors && switchableConnectors.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Switch Account
            </h3>
            <div className="space-y-2">
              {switchableConnectors.map((connector: any) => {
                // Check if this connector is currently the primary connector
                const isSelected = connector.id === primaryConnectorId;

                return (
                  <Button
                    key={connector.id}
                    onClick={() => {
                      console.log('Switch account button clicked:', {
                        connectorId: connector.id,
                        connectorName: connector.name,
                        currentPrimaryConnectorId: primaryConnectorId,
                      });
                      handleSwitchAccount(connector);
                    }}
                    className={`w-full cursor-pointer ${
                      isSelected
                        ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                        : ''
                    }`}
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                  >
                    {connector.name}
                    {isSelected && (
                      <span className="ml-2 text-green-600">✓</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
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
            signingState !== 'idle' &&
            signingState !== 'completed' &&
            signingState !== 'error' &&
            signingState !== 'cancelled'
          }
        >
          {(() => {
            switch (signingState) {
              case 'waiting':
                return 'Waiting for Signature...';
              case 'signing':
                return 'Signing...';
              case 'completed':
                return '✅ Signed!';
              case 'cancelled':
                return '❌ Cancelled';
              case 'error':
                return '❌ Error - Try Again';
              default:
                return 'Sign Message';
            }
          })()}
        </Button>

        {isPara && (
          <Button
            onClick={handleOpenAccountModal}
            className="w-full cursor-pointer"
            size="lg"
          >
            {isPara ? 'Open Para Account Modal' : 'Open Account Modal'}
          </Button>
        )}

        <Button
          onClick={() => open()}
          className="w-full cursor-pointer"
          size="lg"
        >
          Wallet Connect Modal
        </Button>

        <Button
          onClick={() => open({ view: 'Connect' })}
          className="w-full cursor-pointer"
          size="lg"
        >
          Connect external wallet
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
        {!isPara && isParaConnected && (
          <Button
            onClick={async () => {
              console.log('Connection debug info:', {
                isPara,
                isParaConnected,
                isWagmiConnected,
                address,
              });
              // No more recovery function needed with new logic
              console.log('Para detection is now handled automatically');
            }}
            className="w-full cursor-pointer"
            size="lg"
            variant="secondary"
          >
            🔧 Para Connection Info
          </Button>
        )}

        {/* Para Wagmi Connection Recovery Button */}
        {isPara && isParaConnected && !isWagmiConnected && (
          <Button
            onClick={async () => {
              console.log('Attempting to restore Para wagmi connection...');
              const success = await ensureParaWagmiConnection();
              if (success) {
                toast.success(
                  <div className="space-y-2">
                    <div className="font-semibold text-green-800">
                      ✅ Para Connection Restored
                    </div>
                    <div className="text-sm text-green-700">
                      Para is now properly connected to wagmi.
                    </div>
                  </div>,
                  {
                    duration: 3000,
                    dismissible: true,
                    closeButton: true,
                    style: {
                      background:
                        'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
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
                      ❌ Connection Failed
                    </div>
                    <div className="text-sm text-red-700">
                      Failed to restore Para wagmi connection.
                    </div>
                  </div>,
                  {
                    duration: 4000,
                    dismissible: true,
                    closeButton: true,
                    style: {
                      background:
                        'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    },
                  }
                );
              }
            }}
            className="w-full cursor-pointer"
            size="lg"
            variant="secondary"
          >
            🔧 Restore Para Wagmi Connection
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
