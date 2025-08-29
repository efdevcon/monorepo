import { useAccount as useWagmiAccount, useConnect, useDisconnect, useSignMessage, useSwitchAccount, useConnections } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { appKit } from '@/config/appkit';

// Global initialization flags shared across all hook instances
// This prevents multiple instances from competing during initialization
let globalInitialized = false;
let globalHasSetPrimaryConnector = false;

// Constants for localStorage persistence
const PRIMARY_CONNECTOR_KEY = 'devconnect_primary_connector';
const PRIMARY_CONNECTOR_TIMESTAMP_KEY = 'devconnect_primary_connector_timestamp';
const CONNECTOR_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Utility functions for localStorage persistence
const savePrimaryConnectorToStorage = (connectorId: string | null) => {
  try {
    if (typeof window !== 'undefined') {
      if (connectorId) {
        localStorage.setItem(PRIMARY_CONNECTOR_KEY, connectorId);
        localStorage.setItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY, Date.now().toString());
        console.log('💾 [STORAGE] Saved primary connector to localStorage:', connectorId);
      } else {
        localStorage.removeItem(PRIMARY_CONNECTOR_KEY);
        localStorage.removeItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY);
        console.log('💾 [STORAGE] Cleared primary connector from localStorage');
      }
    }
  } catch (error) {
    console.error('Failed to save primary connector to localStorage:', error);
  }
};

const loadPrimaryConnectorFromStorage = (availableConnectors?: readonly any[]): string | null => {
  try {
    if (typeof window !== 'undefined') {
      const savedConnector = localStorage.getItem(PRIMARY_CONNECTOR_KEY);
      const savedTimestamp = localStorage.getItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY);
      
      if (savedConnector && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const now = Date.now();
        
        // Check if the saved connector is still valid (not expired)
        if (now - timestamp < CONNECTOR_EXPIRY_TIME) {
          // If connectors list is provided, validate that the saved connector is still available
          if (availableConnectors && availableConnectors.length > 0) {
            const isConnectorAvailable = availableConnectors.some(
              conn => conn.id === savedConnector
            );
            
            if (!isConnectorAvailable) {
              console.log('💾 [STORAGE] Saved connector no longer available, clearing:', savedConnector);
              localStorage.removeItem(PRIMARY_CONNECTOR_KEY);
              localStorage.removeItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY);
              return null;
            }
          }
          
          console.log('💾 [STORAGE] Loaded primary connector from localStorage:', savedConnector);
          return savedConnector;
        } else {
          // Clear expired data
          localStorage.removeItem(PRIMARY_CONNECTOR_KEY);
          localStorage.removeItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY);
          console.log('💾 [STORAGE] Cleared expired primary connector from localStorage');
        }
      }
    }
  } catch (error) {
    console.error('Failed to load primary connector from localStorage:', error);
    // Clear potentially corrupted data
    try {
      localStorage.removeItem(PRIMARY_CONNECTOR_KEY);
      localStorage.removeItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY);
    } catch (clearError) {
      console.error('Failed to clear corrupted localStorage data:', clearError);
    }
  }
  return null;
};

export function useUnifiedConnection() {
  // SIWE configuration - set to false to disable SIWE verification
  const SIWE_ENABLED = false;

  // Wagmi hooks - this is our primary connection layer
  const wagmiAccount = useWagmiAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { connectors: switchableConnectors, switchAccount } = useSwitchAccount();
  const connections = useConnections(); // Added to track all active connections

  // Para SDK hooks - for Para-specific functionality
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();
  const { disconnect: paraDisconnect } = useDisconnect();

  // Skipped state from shared context
  const { isSkipped, setSkipped, clearSkipped } = useSkipped();
  const pathname = usePathname();

  // SIWE state
  const [siweState, setSiweState] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [siweMessage, setSiweMessage] = useState('');
  const [siweSignature, setSiweSignature] = useState('');

  // Primary connector state - this determines which connector is active for signing
  // Initialize with saved value from localStorage if available
  const [primaryConnectorId, _setPrimaryConnectorId] = useState<string | null>(() => {
    // Only try to load from localStorage on the client side
    if (typeof window !== 'undefined') {
      const saved = loadPrimaryConnectorFromStorage();
      if (saved) {
        console.log('🔄 [INIT] Initializing with saved primary connector:', saved);
        // Set global flags since we're restoring from storage
        globalInitialized = true;
        globalHasSetPrimaryConnector = true;
        return saved;
      }
    }
    return null;
  });
  // Note: Using global flags instead of per-instance refs to prevent multiple hook instances from competing
  const intendedPrimaryConnector = useRef<string | null>(primaryConnectorId);

  // Wrapper to log all setPrimaryConnectorId calls and persist to localStorage
  const setPrimaryConnectorId = (value: string | null) => {
    console.log('🔧 [SET_PRIMARY] Setting primaryConnectorId:', {
      from: primaryConnectorId,
      to: value,
      intended: intendedPrimaryConnector.current,
      stack: new Error().stack?.split('\n')[2]?.trim()
    });

    // Update the intended value immediately
    intendedPrimaryConnector.current = value;

    // Only update state if it's actually different
    if (primaryConnectorId !== value) {
      _setPrimaryConnectorId(value);
      
      // Persist to localStorage for page refresh restoration
      savePrimaryConnectorToStorage(value);
    }
  };

    // Memoized Para connector
  const paraConnector = useMemo(() => connectors.find(c => c.id === 'para' || c.id === 'getpara'), [connectors]);

  // console.log('connectors', connectors);

  // Determine connection status
  const isWagmiConnected = wagmiAccount.isConnected;
  const isParaConnected = paraAccount?.isConnected && paraWallet?.data?.address;

  // Current primary connector
  const primaryConnector = useMemo(() => {
    // If we have a primary connector ID, find that connector
    if (primaryConnectorId) {
      return connectors.find(c => c.id === primaryConnectorId);
    }
    
    // If no primary connector is set, try to determine from current wagmi connection
    if (wagmiAccount.connector) {
      return wagmiAccount.connector;
    }
    
    // Only fallback to Para connector if it's actually connected and no other connection exists
    if (paraConnector && isParaConnected && !wagmiAccount.connector) {
      return paraConnector;
    }
    
    return null;
  }, [connectors, primaryConnectorId, wagmiAccount.connector, paraConnector, isParaConnected]);

  // The primary connection is always wagmi-based
  const isConnected = isWagmiConnected && !!wagmiAccount.address;
  
  // Get the active address (only when actually connected)
  const address = isConnected ? wagmiAccount.address : undefined;

  // Determine if Para is the primary connector
  const isPara = useMemo(() => {
    // Primary source of truth: if we have a primary connector ID, use that
    if (primaryConnectorId) {
      return primaryConnectorId === 'para' || primaryConnectorId === 'getpara';
    }
    
    // Secondary: check current wagmi connection
    if (wagmiAccount.connector) {
      const connectorId = wagmiAccount.connector.id;
      return connectorId === 'para' || connectorId === 'getpara';
    }
    
    // Fallback: only if Para is connected and no other connection exists
    return false; // Be more conservative to avoid inconsistencies
  }, [primaryConnectorId, wagmiAccount.connector]);

  // Consolidated primary connector management - handles both initialization and restoration
  useEffect(() => {
    // Skip if already initialized globally to prevent multiple hook instances from competing
    if (globalInitialized) {
      return;
    }

    // Priority 1: Restore from localStorage (highest priority for user preference persistence)
    const savedConnector = loadPrimaryConnectorFromStorage(connectors);
    if (savedConnector && !primaryConnectorId && !intendedPrimaryConnector.current) {
      console.log('🔄 [INIT] Restoring primary connector from localStorage:', savedConnector, {
        globalInitialized,
        globalHasSetPrimaryConnector,
        currentPrimaryConnectorId: primaryConnectorId,
        intendedPrimaryConnector: intendedPrimaryConnector.current
      });

      // Set global flags IMMEDIATELY to prevent race conditions across hook instances
      globalInitialized = true;
      globalHasSetPrimaryConnector = true;
      intendedPrimaryConnector.current = savedConnector;

      setPrimaryConnectorId(savedConnector);
      return;
    }

    // Priority 2: Restore from existing wagmi connection (for page refresh without localStorage)
    if (wagmiAccount.connector && !primaryConnectorId && !intendedPrimaryConnector.current) {
      const connectorId = wagmiAccount.connector.id;
      console.log('🔄 [INIT] Restoring primary connector from wagmi connection:', connectorId, {
        globalInitialized,
        globalHasSetPrimaryConnector,
        currentPrimaryConnectorId: primaryConnectorId,
        intendedPrimaryConnector: intendedPrimaryConnector.current
      });

      // Set global flags IMMEDIATELY to prevent race conditions across hook instances
      globalInitialized = true;
      globalHasSetPrimaryConnector = true;
      intendedPrimaryConnector.current = connectorId;

      setPrimaryConnectorId(connectorId);
      return;
    }

    // Priority 3: Set Para as primary only if no wagmi connection exists and no primary connector is set
    if (paraConnector && !wagmiAccount.connector && !primaryConnectorId && !intendedPrimaryConnector.current && !globalHasSetPrimaryConnector) {
      console.log('🔄 [INIT] Setting Para as primary connector (no existing wagmi connection)', {
        globalInitialized,
        globalHasSetPrimaryConnector,
        currentPrimaryConnectorId: primaryConnectorId,
        intendedPrimaryConnector: intendedPrimaryConnector.current
      });

      // Set global flags IMMEDIATELY to prevent race conditions across hook instances
      globalInitialized = true;
      globalHasSetPrimaryConnector = true;
      intendedPrimaryConnector.current = paraConnector.id;

      setPrimaryConnectorId(paraConnector.id);
      return;
    }

    // Mark as initialized globally even if no connector is set to prevent repeated attempts
    if (connectors.length > 0) {
      globalInitialized = true;
    }
  }, [wagmiAccount.connector, paraConnector, connectors.length]);

  // Note: Removed the effect that reset hasSetPrimaryConnector.current when primaryConnectorId becomes null
  // This was causing interference with the restoration process

  // Reset global initialization flags only when explicitly disconnecting (not during page refresh)
  useEffect(() => {
    // Only reset if we were previously connected and now both are null AND we're not connected at all
    // This prevents reset during page refresh when values are temporarily null
    if (!wagmiAccount.connector && !primaryConnectorId && !wagmiAccount.isConnecting && !wagmiAccount.isReconnecting && !wagmiAccount.isConnected) {
      globalInitialized = false;
      globalHasSetPrimaryConnector = false;
      intendedPrimaryConnector.current = null;
    }
  }, [wagmiAccount.connector, primaryConnectorId, wagmiAccount.isConnecting, wagmiAccount.isReconnecting, wagmiAccount.isConnected]);

  // Sync Para connection to Wagmi
  useEffect(() => {
    if (isParaConnected && paraConnector) {
      const isParaWagmiConnected = connections.some(conn => conn.connector.id === paraConnector.id);
      if (!isParaWagmiConnected) {
        console.log('Para SDK connected but not in Wagmi connections, connecting Para to wagmi...');
        connect({ connector: paraConnector });
      }
    }
  }, [isParaConnected, paraConnector, connect, connections]);

  // Monitor connection state changes (reduced logging)
  useEffect(() => {
    // Only log when there are meaningful changes
    if (isConnected && address) {
      console.log('Connection state:', {
        isConnected,
        address,
        primaryConnectorId,
        isPara,
        wagmiConnector: wagmiAccount.connector?.id
      });
    }
  }, [isConnected, address, primaryConnectorId, isPara, wagmiAccount.connector?.id]);

  // Log primary connector changes (only when it actually changes)
  const prevPrimaryConnectorId = useRef<string | null>(null);
  useEffect(() => {
    if (primaryConnectorId !== prevPrimaryConnectorId.current) {
      console.log('Primary connector changed:', {
        from: prevPrimaryConnectorId.current,
        to: primaryConnectorId,
        currentWagmiConnector: wagmiAccount.connector?.id,
        isPara
      });
      prevPrimaryConnectorId.current = primaryConnectorId;
    }
  }, [primaryConnectorId, wagmiAccount.connector?.id, isPara]);

  // Handle switching primary connector
  const switchPrimaryConnector = async (connectorId: string) => {
    try {
      console.log('Switching primary connector to:', connectorId);

      // Find the connector
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      // Check if already connected
      const isAlreadyConnected = connections.some(conn => conn.connector.id === connectorId);

      if (!isAlreadyConnected) {
        console.log('Connecting to new connector:', connectorId);
        await connect({ connector });
      } else if (connectorId !== wagmiAccount.connector?.id) {
        console.log('Switching to existing connector:', connectorId);
        await switchAccount({ connector });
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
      console.log('🔄 [SWITCH] Switching account within connector:', connector.id, {
        currentPrimaryConnectorId: primaryConnectorId,
        currentWagmiConnector: wagmiAccount.connector?.id
      });

      // Always set the primary connector before switching to ensure consistency
      setPrimaryConnectorId(connector.id);

      await switchAccount({ connector });

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
      const isParaWagmiConnected = connections.some(conn => conn.connector.id === paraConnector.id);
      if (isParaConnected && !isParaWagmiConnected) {
        console.log('Ensuring Para is connected to wagmi...');
        await connect({ connector: paraConnector });
        console.log('Para successfully connected to wagmi');
        return true;
      } else if (isParaWagmiConnected) {
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
      // Disconnect from wagmi first
      await disconnect();

      // Optionally disconnect Para SDK if method exists (assuming it does; adjust as needed)
      paraDisconnect();

      // Clear primary connector after successful disconnect
      setPrimaryConnectorId(null);

      // Reset global initialization flags to allow fresh start
      globalInitialized = false;
      globalHasSetPrimaryConnector = false;
      intendedPrimaryConnector.current = null;

      // Clear localStorage to ensure clean state
      savePrimaryConnectorToStorage(null);

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

      // Ensure primary is active
      if (primaryConnector.id !== wagmiAccount.connector?.id) {
        await switchPrimaryConnector(primaryConnector.id);
      }

      // If Para is the primary connector, ensure it's connected
      if (isPara) {
        await ensureParaWagmiConnection();
      }

      // Sign using the active connector (no 'connector' param needed)
      const signature = await signMessageAsync({ message });

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
    const chainId = wagmiAccount.chainId ?? 8453; // Dynamic chain ID, fallback to 8453

    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
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
    paraEmail: paraAccount?.embedded?.email || null,

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
