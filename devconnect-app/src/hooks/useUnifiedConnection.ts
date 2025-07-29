import { useAccount as useWagmiAccount, useConnect } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';

export function useUnifiedConnection() {
  // Wagmi connection status
  const wagmiAccount = useWagmiAccount();
  const { connect, connectors } = useConnect();
  console.log('wagmiAccount', wagmiAccount);
  
  // Para connection status
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();

  // Skipped state from shared context
  const { isSkipped, setSkipped, clearSkipped } = useSkipped();

  // Current pathname for navigation logic
  const pathname = usePathname();

  // Determine which connection is active
  const isParaConnected = paraAccount && paraWallet;
  const isWagmiConnected = wagmiAccount.isConnected;

  // Check if Para SDK is connected (either through wagmi connector or direct Para SDK)
  const isPara = wagmiAccount.connector?.id === 'para'// || isParaConnected;

  // Get the active address (prioritize Para SDK address, fallback to wagmi address)
  const address = paraWallet?.data?.address || wagmiAccount.address;
  
  // Unified connection status - user is connected if either wagmi or Para SDK is connected
  const isConnected = (isWagmiConnected || isParaConnected) && address;

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

  // Force wagmi Para connector connection
  const forceWagmiParaConnection = async () => {
    const paraConnector = connectors.find((connector) => connector.id === 'para');
    if (!paraConnector) {
      console.error('Para connector not found');
      return false;
    }

    try {
      console.log('Forcing wagmi Para connector connection...');
      await connect({ connector: paraConnector });
      console.log('Wagmi Para connector connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect wagmi Para connector:', error);
      return false;
    }
  };

  // Auto-connect wagmi if Para SDK is connected but wagmi isn't
  const ensureWagmiConnection = async () => {
    if (isParaConnected && !isWagmiConnected) {
      console.log('Para SDK connected but wagmi not connected, forcing connection...');
      return await forceWagmiParaConnection();
    }
    return true;
  };

  // Determine if user should be redirected to onboarding
  const shouldRedirectToOnboarding = () => {
    // Don't redirect if user has skipped
    if (isSkipped) return false;

    // Don't redirect on onboarding page itself
    if (pathname === '/onboarding') return false;

    // Don't redirect if connected via any method
    if (isWagmiConnected || isParaConnected) return false;

    // Redirect if not connected and not on onboarding
    return true;
  };

  return {
    // Unified connection status (for parent components)
    isConnected,
    address,

  // Individual connection states
    isWagmiConnected,
    isParaConnected,
    isPara,
    wagmiAccount,
    paraAccount,
    paraWallet,

    // Active connection details
    activeConnection,

    // Para wallet for signing
    paraWalletData: paraWallet?.data,

    // Skipped state
    isSkipped,
    setSkipped,
    clearSkipped,

    // Connection utilities
    forceWagmiParaConnection,
    ensureWagmiConnection,

    // Navigation logic
    shouldRedirectToOnboarding,
    shouldShowNavigation,
  };
} 
