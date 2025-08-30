import { useAccount as useWagmiAccount, useConnect, useDisconnect, useSignMessage, useSwitchAccount, useConnections } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';
import { useSkipped } from '@/context/SkippedContext';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { appKit } from '@/config/appkit';

// Global state shared across all hook instances with proper synchronization
let globalInitialized = false;
let globalHasSetPrimaryConnector = false;
let globalPrimaryConnectorId: string | null = null;
let globalInitLock = false; // Mutex to prevent concurrent initialization
let globalLastIntentionalChange = 0; // Timestamp of last intentional connector change
const INTENTIONAL_CHANGE_COOLDOWN = 2000; // 2 seconds cooldown after intentional change

// Global state change listeners for synchronization across hook instances
const globalStateListeners = new Set<() => void>();
let listenerCleanupScheduled = false;

const notifyGlobalStateChange = () => {
  globalStateListeners.forEach(listener => listener());
};

const addGlobalStateListener = (listener: () => void) => {
  globalStateListeners.add(listener);

  // Schedule cleanup of dead listeners (weak references)
  if (!listenerCleanupScheduled) {
    listenerCleanupScheduled = true;
    setTimeout(() => {
      // In a real implementation, we'd use WeakRef or check if listeners are still alive
      // For now, we'll just reset the flag
      listenerCleanupScheduled = false;
    }, 10000); // Clean up every 10 seconds
  }

  return () => {
    globalStateListeners.delete(listener);
  };
};

// Cleanup function for when the module is unloaded
const cleanupGlobalState = () => {
  globalStateListeners.clear();
  globalInitialized = false;
  globalHasSetPrimaryConnector = false;
  globalPrimaryConnectorId = null;
  globalInitLock = false;
  globalLastIntentionalChange = 0;
};

// Register cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupGlobalState);
}

// Acquire initialization lock with timeout
const acquireInitLock = (timeout = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const tryAcquire = () => {
      if (!globalInitLock) {
        globalInitLock = true;
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeout) {
        console.warn('🔄 [INIT_LOCK] Failed to acquire initialization lock within timeout');
        resolve(false);
        return;
      }

      setTimeout(tryAcquire, 10);
    };

    tryAcquire();
  });
};

const releaseInitLock = () => {
  globalInitLock = false;
};

const setGlobalPrimaryConnectorId = (value: string | null) => {
  if (globalPrimaryConnectorId !== value) {
    const oldValue = globalPrimaryConnectorId;
    globalPrimaryConnectorId = value;
    savePrimaryConnectorToStorage(value);
    console.log('🌐 [GLOBAL_STATE] Global primary connector changed:', {
      from: oldValue,
      to: value,
      isPara: value === 'para' || value === 'getpara',
      willBeSaved: !!value,
      timestamp: Date.now()
    });
    notifyGlobalStateChange();
  }
};

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
      
      console.log('💾 [STORAGE_DEBUG] Loading from localStorage:', {
        savedConnector,
        savedTimestamp,
        isPara: savedConnector === 'para' || savedConnector === 'getpara'
      });

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

  // Primary connector state - use global state synchronized across all hook instances
  const [primaryConnectorId, _setPrimaryConnectorId] = useState<string | null>(() => {
    // Initialize from global state or localStorage (only once)
    if (globalPrimaryConnectorId !== null) {
      return globalPrimaryConnectorId;
    }

    // Only the first hook instance should initialize from localStorage
    if (typeof window !== 'undefined' && !globalInitialized) {
      const saved = loadPrimaryConnectorFromStorage();
      if (saved) {
        console.log('🔄 [INIT] Initializing with saved primary connector:', saved);
        // Set global state
        globalPrimaryConnectorId = saved;
        globalInitialized = true;
        globalHasSetPrimaryConnector = true;
        return saved;
      }
    }
    return globalPrimaryConnectorId;
  });

  // Sync local state with global state changes
  useEffect(() => {
    const unsubscribe = addGlobalStateListener(() => {
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
    });

    return () => {
      unsubscribe();
    };
  }, []); // Remove dependency to prevent re-subscription

  // Note: Using global state instead of per-instance state to prevent multiple hook instances from competing
  const intendedPrimaryConnector = useRef<string | null>(null);

  // Sync intended connector with actual primary connector
  useEffect(() => {
    if (primaryConnectorId && intendedPrimaryConnector.current !== primaryConnectorId) {
      console.log('🔧 [INTENDED_SYNC] Syncing intended connector:', {
        from: intendedPrimaryConnector.current,
        to: primaryConnectorId,
        stack: new Error().stack?.split('\n')[2]?.trim()
      });
      intendedPrimaryConnector.current = primaryConnectorId;
    }
  }, [primaryConnectorId]);

  // Debug effect to track intendedPrimaryConnector changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (intendedPrimaryConnector.current !== primaryConnectorId) {
        console.log('🔧 [DEBUG] Intended connector mismatch detected:', {
          intended: intendedPrimaryConnector.current,
          actual: primaryConnectorId,
          global: globalPrimaryConnectorId
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [primaryConnectorId]);

  // Wrapper to log all setPrimaryConnectorId calls and update global state
  const setPrimaryConnectorId = (value: string | null, isIntentional = true) => {
    console.log('🔧 [SET_PRIMARY] Setting primaryConnectorId:', {
      from: primaryConnectorId,
      to: value,
      intendedBefore: intendedPrimaryConnector.current,
      isIntentional,
      stack: new Error().stack?.split('\n')[2]?.trim()
    });

    // Update the intended value immediately
    intendedPrimaryConnector.current = value;
    console.log('🔧 [SET_PRIMARY] Intended value updated to:', value, 'current ref value:', intendedPrimaryConnector.current);

    // Mark intentional changes
    if (isIntentional) {
      globalLastIntentionalChange = Date.now();
      console.log('🔧 [SET_PRIMARY] Marked as intentional change, cooldown started');
    }

    // Update global state (this will trigger sync across all hook instances)
    setGlobalPrimaryConnectorId(value);

    console.log('🔧 [SET_PRIMARY] Function completed, global state should be updated');
  };

    // Memoized Para connector
  const paraConnector = useMemo(() => connectors.find(c => c.id === 'para' || c.id === 'getpara'), [connectors]);

  // console.log('connectors', connectors);

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

  // Track last mismatch to avoid log spam
  const lastMismatchKey = useRef<string | null>(null);

  // Consolidated connection and address logic - fixed to respect primary connector
  const { isConnected, address } = useMemo(() => {
    // Priority 1: If primary connector matches current wagmi connection
    if (primaryConnectorId && wagmiAccount.connector?.id === primaryConnectorId) {
      const connected = isWagmiConnected && !!wagmiAccount.address;
      return {
        isConnected: connected,
        address: connected ? wagmiAccount.address : undefined
      };
    }

    // Priority 2: If primary is Para and Para is connected
    if ((primaryConnectorId === 'para' || primaryConnectorId === 'getpara') && isParaConnected && paraWallet?.data?.address) {
      return {
        isConnected: true,
        address: paraWallet.data.address
      };
    }

    // Priority 3: If we have a wagmi connection but it doesn't match primary connector,
    // we should NOT use it - the primary connector should take precedence
    if (primaryConnectorId && wagmiAccount.connector && wagmiAccount.connector.id !== primaryConnectorId) {
      // Only log mismatch once per connector change to avoid spam
      const mismatchKey = `${primaryConnectorId}-${wagmiAccount.connector.id}`;
      if (lastMismatchKey.current !== mismatchKey) {
        console.log('🔗 [CONNECTION_MISMATCH] Primary connector does not match current wagmi connection:', {
          primary: primaryConnectorId,
          current: wagmiAccount.connector.id,
          wagmiAddress: wagmiAccount.address
        });
        lastMismatchKey.current = mismatchKey;
      }
      return {
        isConnected: false,
        address: undefined
      };
    }

    // Priority 4: No primary connector set, use wagmi connection as fallback
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

  // Smart initialization that handles Para auto-reconnection
  useEffect(() => {
    const initialize = async () => {
      console.log('🔄 [INIT_DEBUG] Initialization effect running:', {
        globalInitialized,
        primaryConnectorId,
        connectorsLength: connectors.length,
        hasLock: globalInitLock,
        wagmiConnected: wagmiAccount.isConnected,
        wagmiConnector: wagmiAccount.connector?.id,
        isParaConnected
      });

      // Skip if already initialized globally to prevent multiple hook instances from competing
      if (globalInitialized) {
        console.log('🔄 [INIT_DEBUG] Skipping - already initialized globally');
        return;
      }

      // Acquire initialization lock
      const lockAcquired = await acquireInitLock();
      if (!lockAcquired) {
        console.warn('🔄 [INIT_DEBUG] Failed to acquire initialization lock');
        return;
      }

      try {
        // Double-check initialization status after acquiring lock
        if (globalInitialized) {
          console.log('🔄 [INIT_DEBUG] Already initialized after acquiring lock');
          return;
        }

        // Check if Para has auto-reconnected (Para SDK has its own persistence)
        if (!primaryConnectorId && wagmiAccount.isConnected && wagmiAccount.connector?.id === 'para' && isParaConnected) {
          console.log('🔄 [INIT] Para auto-reconnected, setting as primary connector');
          globalInitialized = true;
          globalHasSetPrimaryConnector = true;
          setPrimaryConnectorId('para', false); // Mark as non-intentional (auto-detection)
          return;
        }

        // Restore from localStorage as fallback
        const savedConnector = loadPrimaryConnectorFromStorage(connectors);
        if (savedConnector && !primaryConnectorId) {
          console.log('🔄 [INIT] Restoring primary connector from localStorage:', savedConnector);
          globalInitialized = true;
          globalHasSetPrimaryConnector = true;
          setPrimaryConnectorId(savedConnector);
          return;
        }

        // Mark as initialized even if no primary connector was restored
        if (connectors.length > 0) {
          globalInitialized = true;
        }
      } finally {
        releaseInitLock();
      }
    };

    initialize();
  }, [connectors.length, wagmiAccount.isConnected, wagmiAccount.connector?.id, isParaConnected]);

  // Special effect to handle Para initialization after page refresh
  useEffect(() => {
    if (!globalInitialized || (primaryConnectorId !== 'para' && primaryConnectorId !== 'getpara')) {
      return;
    }

    console.log('🔄 [INIT_PARA] Para initialization effect running:', {
      isParaConnected,
      paraConnector: !!paraConnector,
      wagmiConnected: wagmiAccount.isConnected,
      connectionsCount: connections.length
    });

    // If Para is the primary connector but Para SDK is not connected yet,
    // give it more time to initialize
    if (!isParaConnected && paraConnector) {
      console.log('🔄 [INIT_PARA] Para SDK not connected yet, waiting for initialization...');

      // Check again after a delay
      const checkParaTimeout = setTimeout(() => {
        console.log('🔄 [INIT_PARA] Checking Para SDK status after delay:', {
          isParaConnected: isParaConnected,
          wagmiConnected: wagmiAccount.isConnected
        });

        // If Para SDK is still not connected but we have a Wagmi connection,
        // the connection might have switched - this is normal
        if (!isParaConnected && wagmiAccount.isConnected) {
          console.log('🔄 [INIT_PARA] Para SDK not connected but Wagmi is connected - connection may have switched');
        }
      }, 5000);

      return () => clearTimeout(checkParaTimeout);
    }
  }, [globalInitialized, primaryConnectorId, isParaConnected, paraConnector, wagmiAccount.isConnected, connections.length]);

  // Improved reconnection logic with Para support
  useEffect(() => {
    let reconnectionTimeoutId: NodeJS.Timeout | null = null;
    let retryTimeoutIds: NodeJS.Timeout[] = [];
    let isCleaningUp = false;
    let lastReconnectionAttempt = 0;
    const RECONNECTION_DEBOUNCE = 5000; // 5 seconds between reconnection attempts

    const clearAllTimeouts = () => {
      if (reconnectionTimeoutId) {
        clearTimeout(reconnectionTimeoutId);
        reconnectionTimeoutId = null;
      }
      retryTimeoutIds.forEach(id => clearTimeout(id));
      retryTimeoutIds = [];
    };

    const attemptReconnection = async (connector: any, attemptNumber: number) => {
      // Check if we're cleaning up
      if (isCleaningUp) return false;

      // Debounce reconnection attempts
      const now = Date.now();
      if (now - lastReconnectionAttempt < RECONNECTION_DEBOUNCE) {
        console.log('🔄 [RECONNECT] Debouncing reconnection attempt');
        return false;
      }
      lastReconnectionAttempt = now;

      try {
        console.log(`🔄 [RECONNECT] Attempt ${attemptNumber}/3 - Connecting to:`, connector.name);

        // Check if conditions are still valid before attempting
        if (wagmiAccount.isConnecting) {
          console.log('🔄 [RECONNECT] Skipping - currently connecting to another wallet');
          return false;
        }

        // If we're already connected to the target connector, success
        if (wagmiAccount.connector?.id === connector.id && wagmiAccount.isConnected) {
          console.log('🔄 [RECONNECT] Already connected to target connector');
          return true;
        }

        await connect({ connector });
        console.log('🔄 [RECONNECT] Successfully reconnected to:', connector.name);
        return true;

      } catch (error) {
        // Check if we're cleaning up
        if (isCleaningUp) return false;

        console.error(`🔄 [RECONNECT] Attempt ${attemptNumber} failed:`, error);

        // Special handling for Para SDK errors
        if (error instanceof Error && (error.message?.includes('privateKey') || error.message?.includes('Para'))) {
          console.warn('🔄 [RECONNECT] Para SDK error detected, skipping retries for Para');
          return false;
        }

        if (attemptNumber < 3) {
          const delay = 2000 * Math.pow(2, attemptNumber - 1); // Exponential backoff
          console.log(`🔄 [RECONNECT] Retrying in ${delay}ms...`);

          const retryTimeoutId = setTimeout(() => {
            if (!isCleaningUp) {
              attemptReconnection(connector, attemptNumber + 1);
            }
          }, delay);

          retryTimeoutIds.push(retryTimeoutId);
        } else {
          console.error('🔄 [RECONNECT] All reconnection attempts failed');
        }

        return false;
      }
    };

    const startReconnectionProcess = () => {
      // Check if we're cleaning up
      if (isCleaningUp) return;

      console.log('🔄 [RECONNECT_DEBUG] Starting reconnection process:', {
        globalInitialized,
        primaryConnectorId,
        hasWagmiConnector: !!wagmiAccount.connector,
        isConnecting: wagmiAccount.isConnecting,
        isConnected: wagmiAccount.isConnected,
        connectorsLength: connectors.length,
        isPara: primaryConnectorId === 'para' || primaryConnectorId === 'getpara',
        paraConnected: isParaConnected,
        connectorMatch: wagmiAccount.connector?.id === primaryConnectorId,
        timeSinceLastAttempt: Date.now() - lastReconnectionAttempt
      });

      // Special case: Para has auto-reconnected but primary connector is different
      if (wagmiAccount.isConnected && wagmiAccount.connector?.id === 'para' && primaryConnectorId !== 'para' && isParaConnected) {
        console.log('🔄 [RECONNECT] Para auto-reconnected, updating primary connector to Para');
        setPrimaryConnectorId('para');
        return;
      }

      // If we have a primary connector and wagmi is connected but to a different connector,
      // we need to switch to the correct connector
      if (primaryConnectorId && wagmiAccount.connector && wagmiAccount.connector.id !== primaryConnectorId && !wagmiAccount.isConnecting) {
        // Only attempt switch if enough time has passed since last attempt
        if (Date.now() - lastReconnectionAttempt >= RECONNECTION_DEBOUNCE) {
          console.log('🔄 [RECONNECT] Primary connector mismatch, attempting to switch:', {
            primary: primaryConnectorId,
            current: wagmiAccount.connector.id
          });

          // Try to switch to the correct connector
          const targetConnector = connectors.find(c => c.id === primaryConnectorId);
          if (targetConnector) {
            attemptReconnection(targetConnector, 1);
            return;
          }
        } else {
          console.log('🔄 [RECONNECT] Skipping switch due to debounce');
        }
      }

      // Skip if already connected to the correct connector or connecting
      if ((wagmiAccount.connector?.id === primaryConnectorId && wagmiAccount.isConnected) || wagmiAccount.isConnecting) {
        console.log('🔄 [RECONNECT] Already connected to correct connector, skipping reconnection');
        return;
      }

      // If no primary connector is set and we're connected, that's fine
      if (!primaryConnectorId && wagmiAccount.isConnected) {
        console.log('🔄 [RECONNECT] No primary connector set but connected, skipping reconnection');
        return;
      }

      // Handle Para connector reconnection
      if (primaryConnectorId === 'para' || primaryConnectorId === 'getpara') {
        console.log('🔄 [RECONNECT] Handling Para connector reconnection');

        // Check if Para is already connected to Wagmi
        if (paraConnector) {
          const isParaWagmiConnected = connections.some(conn => conn.connector.id === paraConnector.id);
          if (isParaWagmiConnected) {
            console.log('🔄 [RECONNECT] Para already connected to Wagmi');
            return;
          }

          // If Para SDK is connected but not synced to Wagmi, sync it
          if (isParaConnected) {
            console.log('🔄 [RECONNECT] Para SDK connected, syncing to Wagmi...');
            attemptReconnection(paraConnector, 1);
            return;
          }
        }

        // If Para SDK is not connected, wait a bit more for it to initialize
        console.log('🔄 [RECONNECT] Para SDK not ready yet, waiting...');
        if (!isCleaningUp) {
          reconnectionTimeoutId = setTimeout(startReconnectionProcess, 2000);
        }
        return;
      }

      // Skip if no primary connector
      if (!primaryConnectorId) {
        console.log('🔄 [RECONNECT] No primary connector set');
        return;
      }

      // Find the saved connector
      const savedConnector = connectors.find(c => c.id === primaryConnectorId);
      if (!savedConnector) {
        console.log('🔄 [RECONNECT_DEBUG] Primary connector not found in available connectors:', {
          primaryConnectorId,
          availableConnectors: connectors.map(c => c.id)
        });

        // If we have fewer connectors, they might still be loading
        if (connectors.length < 6 && !isCleaningUp) {
          console.log('🔄 [RECONNECT_DEBUG] Connectors still loading, will retry later');
          reconnectionTimeoutId = setTimeout(startReconnectionProcess, 3000);
        }
        return;
      }

      // Start reconnection attempts
      attemptReconnection(savedConnector, 1);
    };

    // Only run after initialization
    if (globalInitialized && !isCleaningUp) {
      // Use a longer initial delay to allow wallet extensions and Para SDK to load
      reconnectionTimeoutId = setTimeout(startReconnectionProcess, 3000);
    }

    return () => {
      isCleaningUp = true;
      clearAllTimeouts();
    };
  }, [globalInitialized, primaryConnectorId, wagmiAccount.connector, wagmiAccount.isConnecting, wagmiAccount.isConnected, connectors, connect, isParaConnected, paraConnector, connections]);

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
          console.log('🔄 [RESET] Resetting global initialization flags after confirmed disconnect');
          globalInitialized = false;
          globalHasSetPrimaryConnector = false;
          globalPrimaryConnectorId = null;
          intendedPrimaryConnector.current = null;
          notifyGlobalStateChange();
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

  // Enhanced Para-Wagmi synchronization with auto-detection
  useEffect(() => {
    const syncParaToWagmi = async () => {
      // If we have a Para connection in Wagmi but primary connector is different,
      // this might be Para auto-reconnecting - update primary connector
      if (wagmiAccount.isConnected && wagmiAccount.connector?.id === 'para' && primaryConnectorId !== 'para' && isParaConnected) {
        // Check if we're within cooldown period after an intentional change
        const timeSinceIntentionalChange = Date.now() - globalLastIntentionalChange;
        if (timeSinceIntentionalChange < INTENTIONAL_CHANGE_COOLDOWN) {
          console.log('🔗 [SYNC] Skipping Para auto-detection due to recent intentional change:', {
            timeSinceIntentionalChange,
            cooldownRemaining: INTENTIONAL_CHANGE_COOLDOWN - timeSinceIntentionalChange
          });
          return;
        }

        console.log('🔗 [SYNC] Detected Para auto-reconnection:', {
          wagmiConnector: wagmiAccount.connector?.id,
          primaryConnectorId,
          isParaConnected,
          globalPrimaryConnectorId,
          timeSinceIntentionalChange
        });
        setPrimaryConnectorId('para', false); // Mark as non-intentional (auto-detection)
        return;
      }

      // Only sync if we have a Para connector and it's the primary connector
      if (!paraConnector || (primaryConnectorId !== 'para' && primaryConnectorId !== 'getpara')) {
        return;
      }

      const isParaWagmiConnected = connections.some(conn => conn.connector.id === paraConnector.id);

      // If Para is connected to Wagmi, nothing to do
      if (isParaWagmiConnected) {
        console.log('🔗 [SYNC] Para already connected to Wagmi');
        return;
      }

      // If Para SDK is connected but not synced to Wagmi, sync it
      if (isParaConnected) {
        console.log('🔗 [SYNC] Para SDK connected but not in Wagmi connections, syncing...');
        try {
          await connect({ connector: paraConnector });
          console.log('🔗 [SYNC] Successfully synced Para to Wagmi');
        } catch (error) {
          console.error('🔗 [SYNC] Failed to sync Para to Wagmi:', error);
        }
        return;
      }

      // If Para is primary but Para SDK is not connected and Wagmi is not connected,
      // Para SDK might still be initializing
      console.log('🔗 [SYNC] Para SDK not ready yet, waiting for initialization...');
    };

    // Run sync immediately and also set up an interval to check periodically
    syncParaToWagmi();

    const syncInterval = setInterval(syncParaToWagmi, 2000); // Check every 2 seconds

    return () => clearInterval(syncInterval);
  }, [isParaConnected, paraConnector, connect, connections, primaryConnectorId, wagmiAccount.isConnected, wagmiAccount.connector?.id]);

  // Monitor connection state changes (reduced logging)
  useEffect(() => {
    // Only log when there are meaningful changes
    if (isConnected && address) {
      console.log('Connection state:', {
        isConnected,
        address,
        primaryConnectorId,
        globalPrimaryConnectorId,
        isPara,
        wagmiConnector: wagmiAccount.connector?.id,
        stateMatch: primaryConnectorId === globalPrimaryConnectorId,
        connectorMatch: wagmiAccount.connector?.id === primaryConnectorId,
        globalConnectorMatch: wagmiAccount.connector?.id === globalPrimaryConnectorId,
        addressMatchesPrimary: wagmiAccount.connector?.id === primaryConnectorId
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
        currentWagmiConnector: wagmiAccount.connector?.id,
        targetConnector: connector.id
      });

      // Set the primary connector before switching
      setPrimaryConnectorId(connector.id);
      console.log('🔄 [SWITCH] Primary connector updated to:', connector.id);

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
        setPrimaryConnectorId(null);
        intendedPrimaryConnector.current = null;
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
