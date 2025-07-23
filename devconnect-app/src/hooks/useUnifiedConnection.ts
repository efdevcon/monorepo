import { useAppKitAccount } from '@reown/appkit/react';
import { useAccount as useWagmiAccount } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';
import { useAppKitProvider } from '@reown/appkit/react';

export function useUnifiedConnection() {
  // AppKit connection status
  const appKitAccount = useAppKitAccount();
  
  // Wagmi connection status
  const wagmiAccount = useWagmiAccount();
  
  // Para connection status
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();

  // Get wallet provider to check if it's Para
  const { walletProvider } = useAppKitProvider('eip155');

  // Skipped state from shared context
  const { isSkipped, setSkipped, clearSkipped } = useSkipped();

  // Current pathname for navigation logic
  const pathname = usePathname();

  // Determine which connection is active
  const isAppKitConnected = appKitAccount?.isConnected;
  const isWagmiConnected = wagmiAccount?.isConnected;
  const isParaConnected = paraAccount?.isConnected;

  // Check if the current wallet provider is Para
  const isPara = !!(walletProvider as { para?: unknown })?.para;

  // Get the active connection details
  const getActiveConnection = () => {
    if (isParaConnected && paraWallet?.data?.address) {
      return {
        type: 'para' as const,
        address: paraWallet.data.address,
        isConnected: true,
        account: paraAccount,
        wallet: paraWallet.data,
      };
    }
    
    if (isWagmiConnected && wagmiAccount?.address) {
      return {
        type: 'wagmi' as const,
        address: wagmiAccount.address,
        isConnected: true,
        account: wagmiAccount,
      };
    }
    
    if (isAppKitConnected && appKitAccount?.address) {
      return {
        type: 'appkit' as const,
        address: appKitAccount.address,
        isConnected: true,
        account: appKitAccount,
      };
    }
    
    return {
      type: 'none' as const,
      address: undefined,
      isConnected: false,
      account: undefined,
    };
  };

  const activeConnection = getActiveConnection();

  // Show navigation if connected, skipped, or on any page other than homepage
  const shouldShowNavigation = activeConnection.isConnected || isSkipped || pathname !== '/';

  const result = {
  // Unified connection status - only for actual wallet connections
    isConnected: activeConnection.isConnected,
    address: activeConnection.address,
    isPara,
    isSkipped,

    // New property to determine if navigation should be shown
    shouldShowNavigation,

    // Functions to manage skipped state
    setSkipped,
    clearSkipped,
    
    // Individual connection statuses
    isAppKitConnected,
    isWagmiConnected,
    isParaConnected,
    
    // Individual account objects
    appKitAccount,
    wagmiAccount,
    paraAccount,
    paraWallet,
    
    // Active connection details
    activeConnection,
    
    // Para wallet for signing
    paraWalletData: paraWallet?.data,
  };

  console.log('useUnifiedConnection returning:', {
    isConnected: result.isConnected,
    isSkipped: result.isSkipped,
    shouldShowNavigation: result.shouldShowNavigation,
    pathname,
    activeConnectionIsConnected: activeConnection.isConnected,
    isPara: result.isPara
  });

  return result;
} 
