import { useAccount as useWagmiAccount, useConnect, useDisconnect, useSignMessage, useSwitchAccount } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { appKit } from '@/config/appkit';

export function useUnifiedConnection() {
  // SIWE configuration - set to false to disable SIWE verification
  const SIWE_ENABLED = false;

  // Wagmi hooks - this is our primary connection layer
  const wagmiAccount = useWagmiAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { connectors: switchableConnectors, switchAccount } = useSwitchAccount();

  // Para SDK hooks - for Para-specific functionality
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();

  // Skipped state from shared context
  const { isSkipped, setSkipped, clearSkipped } = useSkipped();
  const pathname = usePathname();

  // SIWE state
  const [siweState, setSiweState] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [siweMessage, setSiweMessage] = useState('');
  const [siweSignature, setSiweSignature] = useState('');

  // Primary connector state - this determines which connector is active for signing
  const [primaryConnectorId, setPrimaryConnectorId] = useState<string | null>(null);

  // Find the Para connector (always required)
  const paraConnector = connectors.find(c => c.id === 'para' || c.id === 'getpara');

  // Find the current primary connector
  const primaryConnector = connectors.find(c => c.id === primaryConnectorId) || paraConnector;

  // Determine connection status
  const isWagmiConnected = wagmiAccount.isConnected;
  const isParaConnected = paraAccount?.isConnected && paraWallet?.data?.address;

  // The primary connection is always wagmi-based
  const isConnected = isWagmiConnected && wagmiAccount.address;
  
  // Get the active address (always from wagmi)
  const address = wagmiAccount.address;

  // Determine if Para is the primary connector
  const isPara = primaryConnectorId === 'para' || primaryConnectorId === 'getpara' || (!primaryConnectorId && paraConnector);

  // Set initial primary connector when Para is available
  useEffect(() => {
    if (paraConnector && !primaryConnectorId) {
      setPrimaryConnectorId(paraConnector.id);
      console.log('Setting Para as primary connector');
    }
  }, [paraConnector, primaryConnectorId]);

  // Ensure Para is connected to wagmi when Para SDK is connected
  useEffect(() => {
    if (isParaConnected && !isWagmiConnected && paraConnector) {
      console.log('Para SDK connected but wagmi not connected, connecting Para to wagmi...');

      // Connect Para connector to wagmi
      const connectParaToWagmi = async () => {
        try {
          await connect({ connector: paraConnector });
          console.log('Para successfully connected to wagmi');
        } catch (error) {
          console.error('Failed to connect Para to wagmi:', error);
        }
      };

      // Small delay to allow for state propagation
      setTimeout(connectParaToWagmi, 500);
    }
  }, [isParaConnected, isWagmiConnected, paraConnector, connect]);

  // Monitor connection state changes
  useEffect(() => {
    console.log('Connection state:', {
      isConnected,
      address,
      primaryConnectorId,
      isPara,
      wagmiConnector: wagmiAccount.connector?.id,
      paraConnected: isParaConnected
    });
  }, [isConnected, address, primaryConnectorId, isPara, wagmiAccount.connector?.id, isParaConnected]);

  // Handle switching primary connector
  const switchPrimaryConnector = async (connectorId: string) => {
    try {
      console.log('Switching primary connector to:', connectorId);

      // Find the connector
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      // If switching to a different connector, connect to it first
      if (connectorId !== wagmiAccount.connector?.id) {
        console.log('Connecting to new connector:', connectorId);
        await connect({ connector });
      }

      // Set as primary
      setPrimaryConnectorId(connectorId);
      console.log('Primary connector switched to:', connectorId);

      return true;
    } catch (error) {
      console.error('Failed to switch primary connector:', error);
      return false;
    }
  };

  // Handle account switching within the same connector
  const handleSwitchAccount = async (connector: any) => {
    try {
      console.log('Switching account within connector:', connector.id);
      await switchAccount({ connector });

      // Update primary connector if this is a different connector type
      if (connector.id !== primaryConnectorId) {
        setPrimaryConnectorId(connector.id);
      }

      return true;
    } catch (error) {
      console.error('Failed to switch account:', error);
      return false;
    }
  };

  // Handle connecting to a new wallet
  const handleConnectToWallet = async (connector: any) => {
    try {
      console.log('Connecting to wallet:', connector.id);

      // Connect to the wallet
      await connect({ connector });

      // Set as primary connector
      setPrimaryConnectorId(connector.id);

      return true;
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      return false;
    }
  };

  // Ensure Para is connected to wagmi (useful for recovery)
  const ensureParaWagmiConnection = async () => {
    if (!paraConnector) {
      console.error('Para connector not found');
      return false;
    }

    try {
      if (isParaConnected && !isWagmiConnected) {
        console.log('Ensuring Para is connected to wagmi...');
        await connect({ connector: paraConnector });
        console.log('Para successfully connected to wagmi');
        return true;
      } else if (isWagmiConnected) {
        console.log('Para is already connected to wagmi');
        return true;
      } else {
        console.log('Para SDK not connected, cannot connect to wagmi');
        return false;
      }
    } catch (error) {
      console.error('Failed to ensure Para wagmi connection:', error);
      return false;
    }
  };

  // Enhanced disconnect function
  const handleDisconnect = async () => {
    try {
      // Clear primary connector
      setPrimaryConnectorId(null);

      // Disconnect from wagmi
      await disconnect();

      console.log('Disconnected and cleared primary connector');
    } catch (error) {
      console.error('Disconnect failed:', error);
      throw error;
    }
  };

  // Handle sign message using the primary connector
  const handleSignMessage = async (message: string) => {
    try {
      if (!primaryConnector) {
        throw new Error('No primary connector available for signing');
      }

      console.log('Signing message with primary connector:', primaryConnector.id);

      // If Para is the primary connector, ensure it's connected to wagmi
      if (primaryConnector.id === 'para' || primaryConnector.id === 'getpara') {
        await ensureParaWagmiConnection();
      }

      // Sign using the primary connector
      const signature = await signMessageAsync({
        message,
        connector: primaryConnector
      });

      console.log('Message signed successfully with connector:', primaryConnector.id);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  // SIWE sign-in
  const handleSiweSignIn = async () => {
    if (!SIWE_ENABLED) {
      console.log('SIWE is disabled');
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

      const signature = await handleSignMessage(message);
      setSiweSignature(signature);
      setSiweState('success');

      return true;
    } catch (error) {
      console.error('SIWE sign-in failed:', error);
      setSiweState('error');
      return false;
    }
  };

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

  // Determine if user should be redirected to onboarding
  const shouldRedirectToOnboarding = () => {
    if (isSkipped) return false;
    if (pathname === '/onboarding') return false;
    if (isConnected) return false;
    return true;
  };

  // Show navigation if connected, skipped, or on any page other than homepage
  const shouldShowNavigation = isConnected || isSkipped || pathname !== '/';

  return {
    // Connection status
    isConnected,
    address,
    isPara,

    // Wagmi state
    wagmiAccount,
    isWagmiConnected,

    // Para state
    paraAccount,
    paraWallet,
    isParaConnected,

    // Connectors
    connectors,
    switchableConnectors,
    paraConnector,
    primaryConnector,
    primaryConnectorId,

    // Account switching
    switchPrimaryConnector,
    handleSwitchAccount,
    handleConnectToWallet,

    // Para connection management
    ensureParaWagmiConnection,

    // Signing
    handleSignMessage,
    isSigning,

    // SIWE
    siweState,
    siweMessage,
    siweSignature,
    siweEnabled: SIWE_ENABLED,
    handleSiweSignIn,

    // Disconnect
    disconnect: handleDisconnect,

    // Skipped state
    isSkipped,
    setSkipped,
    clearSkipped,

    // Navigation
    shouldRedirectToOnboarding,
    shouldShowNavigation,
  };
} 
