'use client';

import { useAppKit } from '@reown/appkit/react';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  WalletDisplay,
  WalletAvatarWithFallback,
} from '@/components/WalletDisplay';
import { useGlobalStore } from '@/app/store.provider';
import { useRouter } from 'next/navigation';

// Image assets from local public/images directory
const imgPara = '/images/paraLogo.png';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { open } = useAppKit();
  const {
    isConnected,
    address,
    isPara,
    disconnect,
    para,
    eoa,
    paraEmail,
    primaryType,
    switchWallet,
    hasMultipleWallets,
    isDisconnecting,
    portfolioCache,
    portfolioLoading,
  } = useWallet();
  const storeLogout = useGlobalStore((state) => state.logout);
  const router = useRouter();

  // For compatibility, expose the underlying data
  const connections = eoa.eoaConnections;
  const connectors = eoa.connectors;

  // Build switchable connectors list - include both Para and EOA wallets
  const switchableConnectors = useMemo(() => {
    const wallets: any[] = [];

    // Add Para if it has an address (even if not currently primary)
    // This ensures Para shows up even when EOA is the active wallet
    if (para.address) {
      wallets.push({
        id: 'para',
        name: 'Para',
        address: para.address,
      });
    }

    // Add EOA connectors
    eoa.eoaConnections.forEach((conn) => {
      wallets.push(conn.connector);
    });

    return wallets;
  }, [para.address, eoa.eoaConnections]);

  const primaryConnector = isPara
    ? { id: 'para', name: 'Para', ...para.paraAccount }
    : eoa.wagmiAccount.connector;

  // Debug: Log wallet state when modal opens
  // useEffect(() => {
  //   if (isOpen) {
  //     console.log('🔍 [WALLET_MODAL] Modal opened - wallet state:', {
  //       isPara,
  //       currentAddress: address,
  //       paraAddress: para.address,
  //       paraIsConnected: para.isConnected,
  //       eoaIsConnected: eoa.isConnected,
  //       switchableConnectorsCount: switchableConnectors.length,
  //       switchableConnectors: switchableConnectors.map((c: any) => ({
  //         id: c.id,
  //         name: c.name,
  //         address: c.address,
  //       })),
  //     });
  //   }
  // }, [
  //   isOpen,
  //   isPara,
  //   address,
  //   para.address,
  //   para.isConnected,
  //   eoa.isConnected,
  //   switchableConnectors,
  // ]);

  if (!isOpen) return null;

  // Portal requires document to exist (client-side only)
  if (typeof document === 'undefined') return null;

  // Debug each connector's properties
  // if (switchableConnectors && switchableConnectors.length > 0) {
  //   switchableConnectors.forEach((connector: any, index: number) => {
  //     console.log(`🔌 [WALLET_MODAL] Connector ${index}:`, {
  //       id: connector.id,
  //       name: connector.name,
  //       address: connector.address,
  //       type: connector.type,
  //       uid: connector.uid,
  //       allProperties: Object.keys(connector),
  //       // Check for nested address properties
  //       accounts: connector.accounts,
  //       getAccounts: connector.getAccounts,
  //       // Check if address is in a different property
  //       connectorAddress: connector.connector?.address,
  //       providerAddress: connector.provider?.address,
  //       // Full connector object for inspection
  //       fullConnector: connector,
  //     });
  //   });
  // }

  // Debug connections array
  // if (connections && connections.length > 0) {
  //   console.log('🔌 [WALLET_MODAL] Connections array:', connections);
  //   connections.forEach((connection: any, index: number) => {
  //     console.log(`🔌 [WALLET_MODAL] Connection ${index}:`, {
  //       connector: connection.connector?.id,
  //       connectorName: connection.connector?.name,
  //       accounts: connection.accounts,
  //       chainId: connection.chainId,
  //       allProperties: Object.keys(connection),
  //     });
  //   });
  // }

  const handleAddWallet = () => {
    open({ view: 'Connect' });
    onClose();
  };

  const handleDisconnect = async () => {
    try {
      console.log('🔌 [WALLET_MODAL] Starting disconnect process');
      const isPara = primaryType === 'para';
      await disconnect();
      if (isPara) {
        console.log('🔌 [WALLET_MODAL] Para is active, logging out');
        localStorage.removeItem('loginIsSkipped');
        storeLogout();
        router.push('/onboarding');
      } else {
        console.log('🔌 [WALLET_MODAL] EOA is active, disconnecting');
      }

      toast.success(
        <div className="space-y-1">
          <div className="font-semibold text-green-800">🔓 Disconnected</div>
          <div className="text-sm text-green-700">
            Wallet disconnected successfully
          </div>
        </div>,
        {
          duration: 3000,
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

      onClose();
    } catch (err) {
      console.error('🔌 [WALLET_MODAL] Disconnect failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold text-red-800">❌ Disconnect Failed</div>
          <div className="text-sm text-red-700">{errorMessage}</div>
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

  // Helper function to get address for a connector
  const getConnectorAddress = (connector: any) => {
    // First try to find the address from connections array
    const connection = connections?.find(
      (conn) => conn.connector?.id === connector.id
    );
    if (connection?.accounts?.[0]) {
      return connection.accounts[0];
    }

    // Fallback to connector properties
    return (
      connector.address ||
      connector.accounts?.[0] ||
      connector.connector?.address ||
      connector.provider?.address
    );
  };

  // Helper function to format balance
  const formatBalance = (value: number | undefined) => {
    if (value === undefined || value === null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper function to get portfolio balance for an address
  const getPortfolioBalance = (walletAddress: string | undefined) => {
    if (!walletAddress) return null;
    const addressKey = walletAddress.toLowerCase();
    return portfolioCache[addressKey]?.totalValue;
  };

  // Helper function to count total wallets
  const getTotalWalletCount = () => {
    let count = 0;

    // Count current wallet if connected
    if (isConnected && address) {
      count++;
    }

    // Count unique switchable connectors (excluding current one)
    if (switchableConnectors && switchableConnectors.length > 0) {
      const seenAddresses = new Set<string>();
      if (address) seenAddresses.add(address.toLowerCase()); // Exclude current address

      switchableConnectors.forEach((connector: any) => {
        const connectorAddress = getConnectorAddress(connector);
        if (connectorAddress && typeof connectorAddress === 'string') {
          if (!seenAddresses.has(connectorAddress.toLowerCase())) {
            seenAddresses.add(connectorAddress.toLowerCase());
            count++;
          }
        }
      });
    }

    return count;
  };

  const handleSwitchToWallet = async (connector: any) => {
    try {
      console.log('🔄 [WALLET_MODAL] Switching to wallet:', connector.name);

      // Determine wallet type and switch
      const walletType =
        connector.id === 'para' || connector.id === 'getpara' ? 'para' : 'eoa';
      switchWallet(walletType);

      toast.success(
        <div className="space-y-1">
          <div className="font-semibold text-green-800">
            ✅ Switched Successfully
          </div>
          <div className="text-sm text-green-700">
            Now using {connector.name}
          </div>
        </div>,
        {
          duration: 3000,
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

      onClose();
    } catch (err) {
      console.error('🔄 [WALLET_MODAL] Switch failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold text-red-800">❌ Switch Failed</div>
          <div className="text-sm text-red-700">{errorMessage}</div>
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

  return createPortal(
    <div
      className="fixed inset-0 bg-black/33 flex items-end justify-center"
      style={{ zIndex: 10000000 }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[393px] rounded-t-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-3">
          <div className="w-6 h-6"></div>
          <h2 className="text-base font-semibold text-[#36364c] tracking-[-0.1px]">
            Wallets
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 pb-8 pt-6">
          {/* Unified Wallets Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {(() => {
              // Create a unified list of all wallets (current + switchable)
              const allWallets = [];

              // Add current wallet if connected
              if (isConnected && address && primaryConnector) {
                allWallets.push({
                  id: primaryConnector.id,
                  name: primaryConnector.name,
                  address: address,
                  isCurrent: true,
                  connector: primaryConnector,
                });
              }

              // Add switchable connectors (excluding current one)
              if (switchableConnectors && switchableConnectors.length > 0) {
                // Filter out duplicates by address, keeping only unique addresses
                const seenAddresses = new Set<string>();
                if (address) seenAddresses.add(address.toLowerCase()); // Exclude current address

                const uniqueConnectors = switchableConnectors.filter(
                  (connector: any) => {
                    const connectorAddress = getConnectorAddress(connector);
                    if (
                      connectorAddress &&
                      typeof connectorAddress === 'string'
                    ) {
                      if (seenAddresses.has(connectorAddress.toLowerCase())) {
                        return false; // Skip this connector as we've already seen this address
                      }
                      seenAddresses.add(connectorAddress.toLowerCase());
                      return true;
                    } else {
                      // If no address, keep the connector (fallback to connector id filtering)
                      return true;
                    }
                  }
                );

                // Sort to prioritize Para wallet first, then others
                const sortedConnectors = uniqueConnectors.sort(
                  (a: any, b: any) => {
                    const aIsPara = a.id === 'para' || a.id === 'getpara';
                    const bIsPara = b.id === 'para' || b.id === 'getpara';
                    if (aIsPara && !bIsPara) return -1;
                    if (!aIsPara && bIsPara) return 1;
                    return 0;
                  }
                );

                sortedConnectors.forEach((connector) => {
                  const connectorAddress = getConnectorAddress(connector);
                  allWallets.push({
                    id: connector.id,
                    name: connector.name,
                    address: connectorAddress,
                    isCurrent: false,
                    connector: connector,
                  });
                });
              }

              // Limit to 2 wallets (current + 1 other + add wallet slot)
              // Para will be prioritized if it exists
              const displayWallets = allWallets.slice(0, 2);

              return displayWallets.map((wallet: any, index: number) => (
                <div
                  key={wallet.id}
                  className="flex flex-col items-center gap-3 cursor-pointer"
                  onClick={() =>
                    !wallet.isCurrent && handleSwitchToWallet(wallet.connector)
                  }
                >
                  <div className="relative">
                    <div
                      className={`w-20 h-20 rounded-lg flex items-center justify-center transition-colors ${
                        wallet.isCurrent
                          ? 'bg-green-100 border-2 border-green-500'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <WalletAvatarWithFallback
                        address={wallet.address}
                        walletId={wallet.id}
                        connectorIcon={
                          wallet.id === 'para'
                            ? '/images/paraLogo.png'
                            : wallet.connector?.icon ||
                              wallet.connector?.connector?.icon ||
                              wallet.connector?.provider?.icon ||
                              '/images/icons/injected.png'
                        }
                        walletName={wallet.name}
                      />
                    </div>
                    {wallet.isCurrent && (
                      <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-[#242436] tracking-[0.1px]">
                      <WalletDisplay address={wallet.address} />
                    </div>
                    {/* <div className="text-sm text-[#4b4b66]">
                      {wallet.address
                        ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                        : 'No address'}
                    </div> */}
                    <div className="text-xs text-[#4b4b66] flex justify-center items-center gap-1">
                      {/* Wallet icon next to type indicator */}
                      {(() => {
                        const connectorIcon =
                          wallet.id === 'para'
                            ? '/images/paraLogo.png'
                            : wallet.connector?.icon ||
                              wallet.connector?.connector?.icon ||
                              wallet.connector?.provider?.icon ||
                              '/images/icons/injected.png';

                        if (connectorIcon) {
                          return (
                            <img
                              src={connectorIcon}
                              alt={wallet.name}
                              className="w-3 h-3 rounded"
                            />
                          );
                        }

                        // Fallback to browser icon for small display
                        return (
                          <svg
                            className="w-3 h-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                            />
                          </svg>
                        );
                      })()}
                      {wallet.id === 'para' || wallet.id === 'getpara' ? (
                        <>
                          <span>Embedded wallet</span>
                        </>
                      ) : (
                        <>
                          <span>External wallet</span>
                        </>
                      )}
                    </div>
                    {/* Balance Display */}
                    <div className="text-xs font-semibold text-[#242436] mt-1">
                      {(() => {
                        const balance = getPortfolioBalance(wallet.address);
                        if (balance !== null && balance !== undefined) {
                          return formatBalance(balance);
                        }
                        return portfolioLoading ? 'Loading...' : '$0.00';
                      })()}
                    </div>
                    {/* <div className="text-xs text-[#4b4b66]">
                      {wallet.isCurrent ? 'Current' : 'Switch'}
                    </div> */}
                  </div>
                </div>
              ));
            })()}

            {/* Add Wallet Slot - only show if less than 2 wallets */}
            {getTotalWalletCount() < 2 && (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-20 h-20 rounded-lg bg-[#f0f0f4] border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={handleAddWallet}
                >
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#242436] tracking-[0.1px]">
                    External wallet
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex-1 bg-red-50 border border-red-200 shadow-[0px_4px_0px_0px_#dc2626] rounded-[1px] px-6 py-3 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisconnecting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full"></div>
                  <span className="text-red-700 text-sm font-bold">
                    {isPara ? 'Logging out...' : 'Disconnecting...'}
                  </span>
                </div>
              ) : (
                <span className="text-red-700 text-sm font-bold">
                  {isPara ? 'Logout' : 'Disconnect wallet'}
                </span>
              )}
            </button>
            {getTotalWalletCount() < 2 && (
              <button
                onClick={handleAddWallet}
                className="flex-1 bg-[#1b6fae] border border-white shadow-[0px_4px_0px_0px_#125181] rounded-[1px] px-6 py-3 flex items-center justify-center hover:bg-[#1a5f9a] transition-colors"
              >
                <span className="text-white text-sm font-bold">Add Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
