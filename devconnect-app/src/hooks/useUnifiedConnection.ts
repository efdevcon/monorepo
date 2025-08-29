import { useAccount as useWagmiAccount, useConnect, useDisconnect, useSignMessage, useSwitchAccount } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { appKit } from '@/config/appkit';

export function useUnifiedConnection() {
  // SIWE configuration - set to false to disable SIWE verification
  const SIWE_ENABLED = false;

  // Wagmi connection status
  const wagmiAccount = useWagmiAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { connectors: switchableConnectors, switchAccount } = useSwitchAccount();
  const providers = appKit?.getProvider('eip155');
  console.log('providers', providers);
  console.log('connectors', connectors);
  // console.log('adapters ddd', appKit.chainAdapters?.eip155?.connectors);
  console.log('connections', appKit.chainAdapters?.eip155?.connections);
  //   [
  //     {
  //       "accounts": [
  //           {
  //               "address": "0x20C85697E4789D7A1570e78688567160426d4cDD"
  //           }
  //       ],
  //       "connectorId": "para"
  //   },
  //   {
  //       "accounts": [
  //           {
  //               "address": "0xBD19a3F0A9CaCE18513A1e2863d648D13975CB30"
  //           }
  //       ],
  //       "connectorId": "io.zerion.wallet"
  //   }
  // ]
  // Para connection status
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();

  // Skipped state from shared context
  const { isSkipped, setSkipped, clearSkipped } = useSkipped();

  // Current pathname for navigation logic
  const pathname = usePathname();

  // SIWE state for wallet-based login
  const [siweState, setSiweState] = useState<
    'idle' | 'signing' | 'success' | 'error'
  >('idle');
  const [siweMessage, setSiweMessage] = useState('');
  const [siweSignature, setSiweSignature] = useState('');

  // Account switching state
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<'para' | 'wagmi' | null>(null);

  // Use refs to track latest state
  const connectionStateRef = useRef({ isConnected: wagmiAccount.isConnected, address: wagmiAccount.address });
  connectionStateRef.current = { isConnected: wagmiAccount.isConnected, address: wagmiAccount.address };

  // Determine which connection is active
  console.log('paraAccount', paraAccount);
  console.log('paraWallet', paraWallet);

  const isParaConnected = paraAccount?.isConnected;
  console.log('isParaConnected', isParaConnected);
  const isWagmiConnected = wagmiAccount.isConnected;
  console.log('isWagmiConnected', isWagmiConnected);

  // Enhanced Para detection logic with fallback mechanisms
  const wagmiParaConnector = wagmiAccount.connector?.id === 'para' || wagmiAccount.connector?.id === 'getpara';
  const paraSDKConnected = isParaConnected && paraWallet?.data?.address;
  const wagmiParaConnected = isWagmiConnected && wagmiParaConnector;
  
  // Check if Para SDK is connected (either through wagmi connector or direct Para SDK)
  // Prioritize Para SDK connection state, with wagmi connector as secondary indicator
  // But if a specific account type is selected, use that instead
  const isPara: boolean = selectedAccountType
    ? selectedAccountType === 'para'
    : Boolean(paraSDKConnected || wagmiParaConnected);
  
  console.log('Para detection details:', {
    wagmiParaConnector,
    paraSDKConnected,
    wagmiParaConnected,
    isPara,
    paraAccountAddress: paraWallet?.data?.address,
    wagmiAddress: wagmiAccount.address,
    wagmiConnectorId: wagmiAccount.connector?.id
  });

  // Get the active address based on selected account type
  const address = selectedAccount || (isPara ? paraWallet?.data?.address : wagmiAccount.address) || wagmiAccount.address;
  console.log('address', address);
  console.log('selectedAccount', selectedAccount);
  console.log('selectedAccountType', selectedAccountType);
  
  // Consider user connected only after SIWE verification (if enabled)
  const isFullyConnected = SIWE_ENABLED
    ? (isPara ? (paraSDKConnected || wagmiParaConnected) : isWagmiConnected) && siweState === 'success'
    : (isPara ? (paraSDKConnected || wagmiParaConnected) : isWagmiConnected);

  // Unified connection status - user is connected if either wagmi or Para SDK is connected
  // For Para wallets, check both Para SDK and wagmi Para connections
  const isConnected = isPara 
    ? (paraSDKConnected || wagmiParaConnected) && address
    : isWagmiConnected && address;

  // Find the Para connector for wagmi
  const paraConnector = connectors.find(
    (connector: any) =>
      connector.id === 'para' ||
      connector.id === 'getpara' ||
      connector.name?.toLowerCase().includes('para')
  );

  // Monitor connection state changes
  useEffect(() => {
    console.log('Connection state changed:', {
      isConnected,
      address,
      connector: connectors.find((c) => c.ready),
      isPara,
      paraSDKConnected,
      wagmiParaConnected,
      timestamp: new Date().toISOString(),
    });
  }, [isConnected, address, connectors, isPara, paraSDKConnected, wagmiParaConnected]);

  // Monitor Para connector specifically
  useEffect(() => {
    if (paraConnector) {
      console.log('Para connector found:', {
        id: paraConnector.id,
        name: paraConnector.name,
        ready: paraConnector.ready,
      });
    } else {
      console.log(
        'Para connector not found. Available connectors:',
        connectors.map((c) => ({ id: c.id, name: c.name, ready: c.ready }))
      );
    }
  }, [paraConnector, connectors]);

  // Monitor Para connection state and auto-recover if needed
  useEffect(() => {
    console.log('Para connection monitoring:', {
      paraSDKConnected,
      wagmiParaConnected,
      isPara,
      selectedAccountType,
      paraAccountAddress: paraWallet?.data?.address,
      wagmiAddress: wagmiAccount.address,
    });

    // Only auto-recover Para connection if no specific account type is selected
    // or if Para is the selected account type
    if (selectedAccountType && selectedAccountType !== 'para') {
      console.log('Non-Para account selected, skipping Para auto-recovery');
      return;
    }

    // If Para SDK is connected but wagmi isn't, try to force connection
    if (paraSDKConnected && !wagmiParaConnected) {
      console.log('Para SDK connected but wagmi not connected, attempting auto-recovery...');
      
      // Add a small delay to allow for state propagation
      const timer = setTimeout(async () => {
        try {
          await forceWagmiParaConnection();
        } catch (error) {
          console.error('Auto-recovery of wagmi Para connection failed:', error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }

    // If wagmi Para is connected but Para SDK isn't, this might be a timing issue
    // Para SDK should catch up automatically, but we can log this for debugging
    if (wagmiParaConnected && !paraSDKConnected) {
      console.log('Wagmi Para connected but Para SDK not connected - this might be a timing issue');
      console.log('Para SDK should catch up automatically, but monitoring for issues...');
    }
  }, [paraSDKConnected, wagmiParaConnected, selectedAccountType, paraWallet?.data?.address, wagmiAccount.address]);

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
    
    if (wagmiParaConnected && wagmiAccount?.address) {
      return {
        type: 'para' as const,
        address: wagmiAccount.address,
        isConnected: true,
        account: wagmiAccount,
        wallet: paraWallet?.data,
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

  // Generate SIWE message
  const generateSiweMessage = (address: string) => {
    const domain = window.location.host;
    const uri = window.location.origin;
    const issuedAt = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: ${uri}
Version: 1
Chain ID: 8453
Nonce: ${nonce}
Issued At: ${issuedAt}`;

    return { message, nonce };
  };

  // Handle SIWE sign-in
  const handleSiweSignIn = async () => {
    if (!SIWE_ENABLED) {
      console.log('SIWE is disabled, skipping verification');
      return true;
    }

    if (!address) {
      console.error('No address available for SIWE');
      return false;
    }

    try {
      setSiweState('signing');
      const { message, nonce } = generateSiweMessage(address);
      setSiweMessage(message);

      console.log('Signing SIWE message:', message);
      const signature = await signMessageAsync({ message });

      setSiweSignature(signature);
      setSiweState('success');
      console.log('SIWE signature:', signature);

      // Here you would typically send the signature to your backend for verification
      // For now, we'll just show success
      return true;
    } catch (error) {
      console.error('SIWE sign-in failed:', error);
      setSiweState('error');
      return false;
    }
  };

  // Force wagmi Para connector connection
  const forceWagmiParaConnection = async () => {
    if (!paraConnector) {
      console.error(
        'Para connector not found. Available connectors:',
        connectors.map((c: any) => ({ id: c.id, name: c.name }))
      );
      return false;
    }

    try {
      console.log('Forcing wagmi Para connector connection...');
      console.log('Para connector state before connection:', {
        id: paraConnector.id,
        name: paraConnector.name,
        ready: paraConnector.ready,
      });

      // Check if already connected
      if (wagmiParaConnected) {
        console.log('Wagmi Para connector already connected');
        return true;
      }

      await connect({ connector: paraConnector });
      console.log('Wagmi Para connector connected successfully');

      // Check connection status after a delay using refs
      setTimeout(() => {
        const currentState = connectionStateRef.current;
        console.log('Checking connection status after Para auth...');
        console.log('Current address:', currentState.address);
        console.log('Current isConnected:', currentState.isConnected);

        // If still not connected, try to reconnect
        if (!currentState.isConnected) {
          console.log('Still not connected, attempting to reconnect...');
          connect({ connector: paraConnector });
        } else {
          console.log('✅ Connection successful!');
        }
      }, 2000); // Increased delay to allow for state updates

      return true;
    } catch (error) {
      console.error('Failed to connect wagmi Para connector:', error);
      return false;
    }
  };

  // Auto-connect wagmi if Para SDK is connected but wagmi isn't
  const ensureWagmiConnection = async () => {
    // Only force Para connection if no specific account type is selected or if Para is selected
    if (selectedAccountType && selectedAccountType !== 'para') {
      console.log('Non-Para account selected, skipping Para connection enforcement');
      return true;
    }

    if (isParaConnected && !isWagmiConnected) {
      console.log('Para SDK connected but wagmi not connected, forcing connection...');
      return await forceWagmiParaConnection();
    }
    return true;
  };

  // Manual recovery function for Para connection issues
  const recoverParaConnection = async () => {
    console.log('Manual Para connection recovery initiated...');
    
    // Only recover Para connection if no specific account type is selected or if Para is selected
    if (selectedAccountType && selectedAccountType !== 'para') {
      console.log('Non-Para account selected, skipping Para connection recovery');
      return true;
    }

    // If Para SDK is connected but wagmi isn't, try to force connection
    if (paraSDKConnected && !wagmiParaConnected) {
      console.log('Attempting to recover wagmi Para connection...');
      return await forceWagmiParaConnection();
    }
    
    // If wagmi Para is connected but Para SDK isn't, this might be a timing issue
    // We can try to trigger a reconnection or wait for Para SDK to catch up
    if (wagmiParaConnected && !paraSDKConnected) {
      console.log('Wagmi Para connected but Para SDK not connected - this is likely a timing issue');
      console.log('Para SDK should catch up automatically. If not, try refreshing the page.');
      return true; // Consider this a successful state since we have a valid connection
    }
    
    // If neither is connected but we have Para account data, try to reconnect
    if (!paraSDKConnected && !wagmiParaConnected && paraAccount) {
      console.log('Attempting to reconnect Para SDK...');
      // This would require additional Para SDK reconnection logic
      return false;
    }
    
    console.log('No recovery needed or recovery not possible');
    return false;
  };

  // Handle account switching
  const handleSwitchAccount = async (connector: any) => {
    try {
      console.log('Switching to account:', connector);

      // Use wagmi's switchAccount function
      await switchAccount({ connector });

      // Update the selected account to the new account's address
      // We need to wait for the account to be switched and get the new address
      setTimeout(() => {
        const newAddress = wagmiAccount.address;
        if (newAddress && newAddress !== selectedAccount) {
          console.log('Account switched to:', newAddress);
          setSelectedAccount(newAddress);

          // Determine the account type based on the connector
          const accountType = connector.id === 'para' || connector.id === 'getpara' ? 'para' : 'wagmi';
          setSelectedAccountType(accountType);
          console.log('Account type set to:', accountType);
        }
      }, 1000);

      return true;
    } catch (error) {
      console.error('Failed to switch account:', error);
      return false;
    }
  };

  // Handle connecting to a new wallet
  const handleConnectToWallet = async (connector: any) => {
    try {
      console.log('Connecting to wallet:', connector);

      // Connect to the selected wallet
      await connect({ connector });

      // Wait for the connection to be established and get the new address
      // Use a promise-based approach for better timing control
      return new Promise((resolve) => {
        const checkConnection = () => {
          const newAddress = wagmiAccount.address;
          if (newAddress && newAddress !== selectedAccount) {
            console.log('Connected to wallet:', connector.name, 'with address:', newAddress);
            setSelectedAccount(newAddress);

            // Determine the account type based on the connector
            const accountType = connector.id === 'para' || connector.id === 'getpara' ? 'para' : 'wagmi';
            setSelectedAccountType(accountType);
            console.log('Account type set to:', accountType);
            resolve(true);
          } else {
            // Check again after a short delay
            setTimeout(checkConnection, 200);
          }
        };

        // Start checking for connection
        setTimeout(checkConnection, 500);

        // Timeout after 10 seconds
        setTimeout(() => {
          console.log('Connection timeout for:', connector.name);
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      return false;
    }
  };

  // Clear selected account (useful for disconnecting)
  const clearSelectedAccount = () => {
    setSelectedAccount(null);
    setSelectedAccountType(null);
  };


  // Handle sign message
  const handleSignMessage = async () => {
    try {
      console.log('Signing message: hello world!');
      const signature = await signMessageAsync({ message: 'hello world!' });
      console.log('Message signed successfully:', signature);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  // Enhanced disconnect function that clears selected account
  const handleDisconnect = async () => {
    try {
      clearSelectedAccount();
      await disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
      throw error;
    }
  };

  // Determine if user should be redirected to onboarding
  const shouldRedirectToOnboarding = () => {
    // Don't redirect if user has skipped
    if (isSkipped) return false;

    // Don't redirect on onboarding page itself
    if (pathname === '/onboarding') return false;

    // Don't redirect if fully connected (including SIWE verification)
    if (isFullyConnected) return false;

    // Redirect if not connected and not on onboarding
    return true;
  };

  return {
    // Unified connection status (for parent components)
    isConnected,
    isFullyConnected,
    address,

    // Individual connection states
    isWagmiConnected,
    isParaConnected,
    isPara,
    paraSDKConnected,
    wagmiParaConnected,
    wagmiAccount,
    paraAccount,
    paraWallet,

    // Active connection details
    activeConnection,

    // Para wallet for signing
    paraWalletData: paraWallet?.data,

    // SIWE state
    siweState,
    siweMessage,
    siweSignature,
    isSigning,
    siweEnabled: SIWE_ENABLED,

    // Skipped state
    isSkipped,
    setSkipped,
    clearSkipped,

    // Account switching
    selectedAccount,
    selectedAccountType,
    switchableConnectors,
    handleSwitchAccount,
    handleConnectToWallet,
    clearSelectedAccount,

    // Connection utilities
    forceWagmiParaConnection,
    ensureWagmiConnection,
    handleSiweSignIn,
    handleSignMessage,
    disconnect: handleDisconnect,
    recoverParaConnection,

    // Navigation logic
    shouldRedirectToOnboarding,
    shouldShowNavigation,

    // Para connector for external use
    paraConnector,
  };
} 
