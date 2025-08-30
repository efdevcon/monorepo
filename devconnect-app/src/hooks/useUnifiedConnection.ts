import { useAccount as useWagmiAccount, useConnect, useDisconnect, useSignMessage, useSwitchAccount, useConnections } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { appKit } from '@/config/appkit';

// Simple state - no complex global management needed

// Simple global state for cross-instance sync
let globalPrimaryConnectorId: string | null = null;
let userIntentTimestamp = 0; // Track when user explicitly chooses a connector

// Initialize user intent timestamp immediately from localStorage
if (typeof window !== 'undefined') {
  const savedTimestamp = localStorage.getItem('devconnect_user_intent_timestamp');
  if (savedTimestamp) {
    userIntentTimestamp = parseInt(savedTimestamp);
    console.log('🔄 [GLOBAL_INIT] Loaded user intent timestamp from localStorage:', userIntentTimestamp);
  }
}
let cachedStorageValue: string | null | undefined = undefined; // Cache localStorage result
let hasResetAfterDisconnect = false; // Prevent multiple reset calls

const setGlobalPrimaryConnectorId = (value: string | null) => {
  if (globalPrimaryConnectorId !== value) {
    globalPrimaryConnectorId = value;
    globalStateChangeCounter += 1; // Trigger sync effect
    // Reset the disconnect flag when user reconnects
    if (value !== null) {
      hasResetAfterDisconnect = false;
    }
    if (value) {
      savePrimaryConnectorToStorage(value);
    }
  }
};

const getCachedStorageValue = (connectors?: readonly any[]): string | null => {
  if (cachedStorageValue === undefined && typeof window !== 'undefined') {
    cachedStorageValue = loadPrimaryConnectorFromStorage(connectors);
  }
  return cachedStorageValue || null;
};

// Simple global state listener for basic sync
const addGlobalStateListener = (listener: () => void) => {
  // For now, just call the listener immediately
  listener();
  return () => { }; // No-op cleanup
};

// Global state change counter for triggering sync
let globalStateChangeCounter = 0;
// Track if initialization has already happened
let hasInitialized = false;

// Constants for localStorage persistence
const PRIMARY_CONNECTOR_KEY = 'devconnect_primary_connector';
const PRIMARY_CONNECTOR_TIMESTAMP_KEY = 'devconnect_primary_connector_timestamp';
const USER_INTENT_TIMESTAMP_KEY = 'devconnect_user_intent_timestamp';
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
      // Invalidate cache when storage changes
      cachedStorageValue = undefined;
    }
  } catch (error) {
    console.error('Failed to save primary connector to localStorage:', error);
  }
};

const saveUserIntentTimestamp = (timestamp: number) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_INTENT_TIMESTAMP_KEY, timestamp.toString());
      console.log('💾 [STORAGE] Saved user intent timestamp:', timestamp);
    }
  } catch (error) {
    console.error('Failed to save user intent timestamp to localStorage:', error);
  }
};

const loadUserIntentTimestamp = (): number => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(USER_INTENT_TIMESTAMP_KEY);
      if (saved) {
        const timestamp = parseInt(saved);
        console.log('💾 [STORAGE] Loaded user intent timestamp:', timestamp);
        return timestamp;
      }
    }
  } catch (error) {
    console.error('Failed to load user intent timestamp from localStorage:', error);
  }
  return 0; // Default to 0 if not found
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
            let isConnectorAvailable = availableConnectors.some(
              conn => conn.id === savedConnector
            );

            // If exact match not found, try alternative matching for known cases
            if (!isConnectorAvailable) {
              // Special handling for Zerion wallet
              if (savedConnector.toLowerCase().includes('zerion')) {
                const alternativeConnector = availableConnectors.find(
                  conn => conn.id === 'injected' ||
                         conn.name?.toLowerCase().includes('zerion') ||
                         conn.name?.toLowerCase().includes('metamask')
                );
                if (alternativeConnector) {
                  console.log('💾 [STORAGE] Found alternative connector for Zerion wallet:', alternativeConnector.id, 'updating stored value');
                  // Update the stored connector to use the correct ID
                  localStorage.setItem(PRIMARY_CONNECTOR_KEY, alternativeConnector.id);
                  localStorage.setItem(PRIMARY_CONNECTOR_TIMESTAMP_KEY, Date.now().toString());
                  // Update the cache to reflect the change
                  cachedStorageValue = alternativeConnector.id;
                  console.log('💾 [STORAGE] Updated stored connector to:', alternativeConnector.id);
                  return alternativeConnector.id;
                }
              }
            }

            if (!isConnectorAvailable) {
              console.log('💾 [STORAGE] Saved connector no longer available, clearing:', savedConnector);
              console.log('💾 [STORAGE] Available connectors:', availableConnectors.map(c => ({ id: c.id, name: c.name })));
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

  // Primary connector state - use global state synchronized across all hook instances
  const [primaryConnectorId, _setPrimaryConnectorId] = useState<string | null>(() => {
    // Initialize from global state if available
    if (globalPrimaryConnectorId !== null) {
      return globalPrimaryConnectorId;
    }

    // For first hook instance, load from cached localStorage (without connectors validation)
    const saved = getCachedStorageValue();
    if (saved) {
      console.log('🔄 [INIT] Initializing with saved primary connector:', saved);
      globalPrimaryConnectorId = saved;
      return saved;
    }
    return null;
  });

  // Sync local state with global state changes
  useEffect(() => {
    // Use a ref to get the current local state to avoid stale closure
    _setPrimaryConnectorId((currentLocal) => {
      if (currentLocal !== globalPrimaryConnectorId) {
        console.log('🔄 [SYNC] Syncing local state with global state:', {
          local: currentLocal,
          global: globalPrimaryConnectorId
        });
        return globalPrimaryConnectorId;
      }
      return currentLocal;
    });
  }, [globalStateChangeCounter]); // Depend on change counter to trigger sync

  // Simple wrapper to set primary connector
  const setPrimaryConnectorId = (value: string | null, isUserIntent = false) => {
    console.log('🔄 [SET_CONNECTOR] Setting primary connector:', {
      value,
      isUserIntent,
      previousTimestamp: userIntentTimestamp,
      currentTime: Date.now()
    });

    _setPrimaryConnectorId(value);
    setGlobalPrimaryConnectorId(value);

    if (isUserIntent) {
      userIntentTimestamp = Date.now();
      saveUserIntentTimestamp(userIntentTimestamp);
      console.log('🔄 [SET_CONNECTOR] Updated user intent timestamp:', userIntentTimestamp);
    }
  };

    // Memoized Para connector
  const paraConnector = useMemo(() => connectors.find(c => c.id === 'para' || c.id === 'getpara'), [connectors]);

  // Determine connection status - simplified and consistent
  const isWagmiConnected = wagmiAccount.isConnected && !!wagmiAccount.address;
  const isParaConnected = paraAccount?.isConnected && !!paraWallet?.data?.address;

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

  // Simple connection and address logic
  const { isConnected, address } = useMemo(() => {
    // If primary connector matches current wagmi connection
    if (primaryConnectorId && wagmiAccount.connector?.id === primaryConnectorId) {
      const connected = isWagmiConnected && !!wagmiAccount.address;
      return {
        isConnected: connected,
        address: connected ? wagmiAccount.address : undefined
      };
    }

    // If primary is Para and Para is connected
    if ((primaryConnectorId === 'para' || primaryConnectorId === 'getpara') && isParaConnected && paraWallet?.data?.address) {
      return {
        isConnected: true,
        address: paraWallet.data.address
      };
    }

    // If we have a wagmi connection but it doesn't match primary connector, don't use it
    if (primaryConnectorId && wagmiAccount.connector && wagmiAccount.connector.id !== primaryConnectorId) {
      return {
        isConnected: false,
        address: undefined
      };
    }

    // No primary connector set, use wagmi connection as fallback
    if (!primaryConnectorId && isWagmiConnected && wagmiAccount.address) {
      return {
        isConnected: true,
        address: wagmiAccount.address
      };
    }

    // Not connected
    return {
      isConnected: false,
      address: undefined
    };
  }, [primaryConnectorId, wagmiAccount.connector?.id, wagmiAccount.address, wagmiAccount.isConnected, isWagmiConnected, isParaConnected, paraWallet?.data?.address]);

  // Determine if Para is the primary connector - simplified to match connection logic
  const isPara = useMemo(() => {
    // Only return true if we're actually connected AND using Para
    if (!isConnected) {
      return false;
    }

    // If we have a primary connector set to Para
    if (primaryConnectorId === 'para' || primaryConnectorId === 'getpara') {
      return true;
    }

    // If no primary connector is set but wagmi connector is Para
    if (!primaryConnectorId && wagmiAccount.connector?.id === 'para') {
      return true;
    }

    return false;
  }, [isConnected, primaryConnectorId, wagmiAccount.connector?.id]);

  // Simple initialization: Para first, then localStorage
  useEffect(() => {
    if (hasInitialized || connectors.length === 0) return; // Don't re-initialize if already done or no connectors available

    hasInitialized = true; // Mark as initialized

    // Small delay to allow everything to initialize properly
    const timer = setTimeout(() => {
      // 1. Check if Para is connected - prioritize it
      if (isParaConnected) {
        console.log('🔄 [INIT] Para detected, setting as primary');
        setPrimaryConnectorId('para');
        return;
      }

      // 2. Check if Wagmi has Para connected
      if (wagmiAccount.isConnected && wagmiAccount.connector?.id === 'para') {
        console.log('🔄 [INIT] Wagmi Para detected, setting as primary');
        setPrimaryConnectorId('para');
        return;
      }

      // 3. Load from localStorage
      const saved = getCachedStorageValue(connectors);
      if (saved) {
        console.log('🔄 [INIT] Loaded from storage:', saved);
        setPrimaryConnectorId(saved);
      }
    }, 50); // Small delay to allow initialization

    return () => clearTimeout(timer);
  }, [isParaConnected, wagmiAccount.isConnected, wagmiAccount.connector?.id, connectors, primaryConnectorId]);

  // Simple Para auto-detection after init (respect user intent)
  useEffect(() => {
    if (!primaryConnectorId) return;

    // If Para connects later, switch to it (but respect user intent)
    if (wagmiAccount.isConnected && wagmiAccount.connector?.id === 'para' && primaryConnectorId !== 'para') {
      // Don't auto-switch if user recently chose a different connector (within 5 seconds)
      const timeSinceUserIntent = Date.now() - userIntentTimestamp;
      console.log('🔄 [PARA_DETECT] Checking user intent:', {
        currentTime: Date.now(),
        userIntentTimestamp,
        timeSinceUserIntent,
        primaryConnectorId,
        wagmiConnector: wagmiAccount.connector?.id
      });

      if (timeSinceUserIntent < 30000) { // 30 seconds to respect user intent
        console.log('🔄 [PARA_DETECT] Skipping Para auto-switch due to recent user intent:', {
          timeSinceUserIntent,
          userChose: primaryConnectorId
        });
        return;
      }

      console.log('🔄 [PARA_DETECT] Para connected later, switching to it (auto)');
      setPrimaryConnectorId('para'); // Auto-detection, not user intent
    }
  }, [wagmiAccount.isConnected, wagmiAccount.connector?.id, primaryConnectorId]);

  // Reconnection for primary connector - handle both connected and disconnected states
  useEffect(() => {
    if (!primaryConnectorId || connectors.length === 0) return;

    let targetConnector = connectors.find(c => c.id === primaryConnectorId);

    // If exact match not found, try to find by name or partial match
    if (!targetConnector) {
      console.log('🔄 [RECONNECT] Primary connector not found by ID:', primaryConnectorId, 'trying alternative matches...');

      // Try to find by name (case insensitive)
      targetConnector = connectors.find(c =>
        c.name?.toLowerCase().includes('zerion') ||
        primaryConnectorId.toLowerCase().includes(c.name?.toLowerCase() || '')
      );

      // If found by name, update the primary connector ID to use the correct connector ID
      if (targetConnector && targetConnector.id !== primaryConnectorId) {
        console.log('🔄 [RECONNECT] Found connector by name, updating primary connector from', primaryConnectorId, 'to', targetConnector.id);
        setPrimaryConnectorId(targetConnector.id, false);
        return; // Exit and let the next effect run with the correct connector ID
      }

      // If still not found and primaryConnectorId contains 'zerion', try 'injected' connector
      if (!targetConnector && primaryConnectorId.toLowerCase().includes('zerion')) {
        targetConnector = connectors.find(c => c.id === 'injected');
        if (targetConnector) {
          console.log('🔄 [RECONNECT] Using injected connector for Zerion wallet, updating primary connector');
          // Update the primary connector ID to use the correct connector
          setPrimaryConnectorId(targetConnector.id, false);
          return; // Exit and let the next effect run with the correct connector ID
        }
      }

      // If still not found, log and clear the invalid connector
      if (!targetConnector) {
        console.warn('🔄 [RECONNECT] No suitable connector found for:', primaryConnectorId, 'clearing saved connector');
        console.log('🔄 [RECONNECT] Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

        // Clear the invalid saved connector
        savePrimaryConnectorToStorage(null);
        setPrimaryConnectorId(null);
        return;
      }
    }

    // Small delay to allow everything to initialize properly and prevent immediate reconnection after disconnect
    const timer = setTimeout(() => {
      // Only attempt reconnection if we haven't just disconnected (check the global flag)
      if (hasResetAfterDisconnect) {
        console.log('🔄 [RECONNECT] Skipping reconnection - recent disconnect detected');
        return;
      }

      // If we're connected to the wrong connector, switch to the right one
      if (wagmiAccount.isConnected && wagmiAccount.connector?.id !== primaryConnectorId && !wagmiAccount.isConnecting) {
        console.log('🔄 [RECONNECT] Switching from', wagmiAccount.connector?.id, 'to primary connector:', primaryConnectorId);
        connect({ connector: targetConnector });
      }
      // If we're not connected at all but have a primary connector, try to connect
      else if (!wagmiAccount.isConnected && !wagmiAccount.isConnecting && !wagmiAccount.isReconnecting) {
        console.log('🔄 [RECONNECT] Not connected, attempting to connect to primary connector:', primaryConnectorId);
        try {
          connect({ connector: targetConnector });
        } catch (error) {
          console.error('🔄 [RECONNECT] Failed to connect to primary connector:', error);
        }
      }
    }, 200); // Slightly longer delay to allow disconnect to complete

    return () => clearTimeout(timer);
  }, [primaryConnectorId, wagmiAccount.isConnected, wagmiAccount.connector?.id, wagmiAccount.isConnecting, wagmiAccount.isReconnecting, connectors]);

    // No auto-switch - user chooses manually
  // This effect is removed to eliminate all automatic switching behavior

  // Note: Removed the effect that reset hasSetPrimaryConnector.current when primaryConnectorId becomes null
  // This was causing interference with the restoration process

  // Reset global initialization flags only when explicitly disconnecting (not during page refresh)
  useEffect(() => {
    let resetTimeoutId: NodeJS.Timeout | null = null;

    // Only reset if we were previously connected and now both are null AND we're not connected at all
    // This prevents reset during page refresh when values are temporarily null
    if (!wagmiAccount.connector && !primaryConnectorId && !wagmiAccount.isConnecting && !wagmiAccount.isReconnecting && !wagmiAccount.isConnected) {
      // Add a longer delay to allow external wallets time to reconnect after page refresh
      resetTimeoutId = setTimeout(() => {
        // Double-check the conditions before resetting (in case wallet reconnected during delay)
        if (!wagmiAccount.connector && !primaryConnectorId && !wagmiAccount.isConnecting && !wagmiAccount.isReconnecting && !wagmiAccount.isConnected) {
          if (!hasResetAfterDisconnect) {
            console.log('🔄 [RESET] Resetting primary connector after disconnect');
            setPrimaryConnectorId(null, false); // Explicitly mark as not user intent
            hasResetAfterDisconnect = true;
          }
        } else {
          console.log('🔄 [RESET] Skipping reset - wallet reconnected during delay');
        }
      }, 5000); // 5 second delay to allow wallet reconnection
    }

    return () => {
      if (resetTimeoutId) {
        clearTimeout(resetTimeoutId);
      }
    };
  }, [wagmiAccount.connector, primaryConnectorId, wagmiAccount.isConnecting, wagmiAccount.isReconnecting, wagmiAccount.isConnected]);

  // Sync Para to Wagmi when primary is Para
  useEffect(() => {
    if (primaryConnectorId === 'para' && isParaConnected && paraConnector) {
      const isParaWagmiConnected = connections.some(conn => conn.connector.id === paraConnector.id);
      if (!isParaWagmiConnected) {
        console.log('🔗 [SYNC] Para SDK connected but not in Wagmi, syncing...');
        connect({ connector: paraConnector });
      }
    }
  }, [primaryConnectorId, isParaConnected, paraConnector, connections]);

  // Monitor connection state changes (reduced logging)
  const lastLoggedState = React.useRef<string | null>(null);
  useEffect(() => {
    if (isConnected && address) {
      const currentState = `${isConnected}-${address}-${primaryConnectorId}-${isPara}-${wagmiAccount.connector?.id}`;

      // Only log if the state actually changed
      if (currentState !== lastLoggedState.current) {
        console.log('Connection state:', {
          isConnected,
          address: `${address.slice(0, 6)}...${address.slice(-4)}`, // Truncate for cleaner logs
          primaryConnectorId,
          globalPrimaryConnectorId,
          isPara,
          wagmiConnector: wagmiAccount.connector?.id,
        });
        lastLoggedState.current = currentState;
      }
    }
  }, [isConnected, address, primaryConnectorId, isPara, wagmiAccount.connector?.id, globalPrimaryConnectorId]);

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
        currentWagmiConnector: wagmiAccount.connector?.id,
        targetConnector: connector.id
      });

      // Reset disconnect flag since user is manually switching
      hasResetAfterDisconnect = false;

      // Set the primary connector before switching (mark as user intent)
      setPrimaryConnectorId(connector.id, true);
      console.log('🔄 [SWITCH] Primary connector updated to:', connector.id, '(user intent)');

      await switchAccount({ connector });
      console.log('🔄 [SWITCH] Wagmi switchAccount completed');

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

      // Reset disconnect flag since user is manually connecting
      hasResetAfterDisconnect = false;

      // Connect to the wallet
      await connect({ connector });

      // Set as primary connector (user intent)
      setPrimaryConnectorId(connector.id, true);

      return true;
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      return false;
    }
  };

    // Utility function to restore external wallet as primary (for recovery scenarios)
  const restoreExternalWalletAsPrimary = async (connectorId: string) => {
    try {
      console.log('🔄 [RESTORE] Attempting to restore external wallet as primary:', connectorId);
      
      const targetConnector = connectors.find(c => c.id === connectorId);
      if (!targetConnector) {
        console.error('🔄 [RESTORE] Connector not found:', connectorId);
        return false;
      }

      // Set as primary connector
      setPrimaryConnectorId(connectorId);

      // If not currently connected to this wallet, try to connect
      if (wagmiAccount.connector?.id !== connectorId) {
        try {
          await connect({ connector: targetConnector });
          console.log('🔄 [RESTORE] Successfully connected to restored wallet:', connectorId);
        } catch (connectError) {
          console.warn('🔄 [RESTORE] Connection failed, but primary connector set:', connectError);
        }
      }

      return true;
    } catch (error) {
      console.error('🔄 [RESTORE] Failed to restore external wallet:', error);
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

  // Enhanced disconnect function with proper coordination and error handling
  const handleDisconnect = async () => {
    const disconnectResults = {
      appKit: false,
      wagmi: false,
      para: false,
      cleanup: false
    };

    try {
      console.log('🔌 [UNIFIED_DISCONNECT] Starting coordinated disconnect, isPara:', isPara);

      // Step 1: Disconnect from AppKit (for external wallets)
      if (!isPara && primaryConnectorId && primaryConnectorId !== 'para' && primaryConnectorId !== 'getpara') {
        console.log('🔌 [UNIFIED_DISCONNECT] Disconnecting from AppKit');
        try {
          await appKit.disconnect();
          disconnectResults.appKit = true;
          console.log('🔌 [UNIFIED_DISCONNECT] AppKit disconnect successful');
        } catch (appKitError) {
          console.error('🔌 [UNIFIED_DISCONNECT] AppKit disconnect failed:', appKitError);
          // Continue with other disconnects even if AppKit fails
        }
      } else {
        disconnectResults.appKit = true; // Not applicable
      }

      // Step 2: Disconnect from wagmi
      console.log('🔌 [UNIFIED_DISCONNECT] Disconnecting from wagmi');
      try {
        await disconnect();
        disconnectResults.wagmi = true;
        console.log('🔌 [UNIFIED_DISCONNECT] Wagmi disconnect successful');
      } catch (wagmiError) {
        console.error('🔌 [UNIFIED_DISCONNECT] Wagmi disconnect failed:', wagmiError);
        // Continue with Para disconnect even if wagmi fails
      }

      // Step 3: Disconnect Para SDK (if applicable)
      if (isPara) {
        console.log('🔌 [UNIFIED_DISCONNECT] Disconnecting Para SDK');
        try {
          paraDisconnect();
          disconnectResults.para = true;
          console.log('🔌 [UNIFIED_DISCONNECT] Para SDK disconnect successful');
        } catch (paraError) {
          console.error('🔌 [UNIFIED_DISCONNECT] Para SDK disconnect failed:', paraError);
          // Continue with cleanup even if Para disconnect fails
        }
      } else {
        disconnectResults.para = true; // Not applicable
      }

      // Step 4: Cleanup state
      console.log('🔌 [UNIFIED_DISCONNECT] Performing state cleanup');
      try {
        // Set disconnect flag to prevent immediate reconnection
        hasResetAfterDisconnect = true;
        // Clear user intent timestamp since user is disconnecting
        userIntentTimestamp = 0;
        saveUserIntentTimestamp(0);
        setPrimaryConnectorId(null);
        localStorage.removeItem(PRIMARY_CONNECTOR_KEY);
        disconnectResults.cleanup = true;
        console.log('🔌 [UNIFIED_DISCONNECT] State cleanup successful');
      } catch (cleanupError) {
        console.error('🔌 [UNIFIED_DISCONNECT] State cleanup failed:', cleanupError);
      }

      // Evaluate overall success
      const allSuccessful = Object.values(disconnectResults).every(result => result);

      if (allSuccessful) {
        console.log('🔌 [UNIFIED_DISCONNECT] All disconnect operations completed successfully');
      } else {
        console.warn('🔌 [UNIFIED_DISCONNECT] Some disconnect operations failed:', disconnectResults);
        // Don't throw error if at least wagmi disconnect succeeded (most important)
        if (!disconnectResults.wagmi) {
          throw new Error('Critical disconnect failure: wagmi disconnect failed');
        }
      }

    } catch (error) {
      console.error('🔌 [UNIFIED_DISCONNECT] Disconnect process failed:', error);
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
    restoreExternalWalletAsPrimary,

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
