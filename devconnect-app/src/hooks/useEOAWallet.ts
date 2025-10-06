'use client';

import {
  useAccount,
  useConnect,
  useDisconnect,
  useConnections,
  useConnectors,
  useSwitchChain,
} from 'wagmi';
import { useState, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { appKit } from '@/config/appkit';

const PRIMARY_EOA_KEY = 'devconnect_eoa_primary';
const PRIMARY_EOA_CONNECTOR_KEY = 'devconnect_eoa_connector';

/**
 * EOA Wallet Hook
 * Manages external wallets (MetaMask, Zerion, etc.) via AppKit
 * No Para synchronization needed - completely independent
 */
export function useEOAWalletConnection() {
  const wagmiAccount = useAccount();
  const { connect, connectors: availableConnectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const connections = useConnections();
  const connectors = useConnectors();
  const { switchChain } = useSwitchChain();
  const { open: openAppKit } = useAppKit();
  
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Filter out Para connector - only EOA connectors
  const eoaConnectors = availableConnectors.filter(
    conn => conn.id !== 'para' && conn.id !== 'getpara'
  );

  // Filter out Para connections - only EOA connections
  const eoaConnections = connections.filter(
    conn => conn.connector.id !== 'para' && conn.connector.id !== 'getpara'
  );

  // EOA connection state (excluding Para)
  const isConnected = wagmiAccount.isConnected && 
    wagmiAccount.connector?.id !== 'para' && 
    wagmiAccount.connector?.id !== 'getpara';
  
  const address = isConnected ? wagmiAccount.address : null;
  const chainId = isConnected ? wagmiAccount.chainId : null;
  const connectorId = isConnected ? wagmiAccount.connector?.id : null;
  const connectorName = isConnected ? wagmiAccount.connector?.name : null;

  // Auto-switch to EOA when it connects
  useEffect(() => {
    if (isConnected && connectorId && typeof window !== 'undefined') {
      const currentEOAConnector = localStorage.getItem(PRIMARY_EOA_CONNECTOR_KEY);

      // Auto-switch to newly connected EOA if it's a different connector than the last one
      // This means: always switch to a newly connected wallet
      if (currentEOAConnector !== connectorId) {
        console.log('🔄 [EOA] Auto-switching to newly connected EOA:', connectorName);
        localStorage.setItem('devconnect_primary_wallet_type', 'eoa');
        localStorage.setItem(PRIMARY_EOA_CONNECTOR_KEY, connectorId);
        window.dispatchEvent(new CustomEvent('primaryWalletTypeChange', { detail: 'eoa' }));
      }
    }
  }, [isConnected, connectorId, connectorName]);

  /**
   * Open AppKit modal to connect EOA wallet
   */
  const connectWallet = () => {
    console.log('🔌 [EOA] Opening AppKit to connect wallet');
    openAppKit();
  };

  /**
   * Disconnect all EOA wallets
   * Uses AppKit disconnect for clean removal
   */
  const disconnect = async () => {
    if (isDisconnecting) {
      console.warn('⚠️ [EOA] Disconnect already in progress');
      return;
    }

    setIsDisconnecting(true);
    console.log('🔌 [EOA] Starting EOA disconnect');

    try {
      // First try AppKit disconnect
      try {
        await appKit.disconnect();
        console.log('✅ [EOA] AppKit disconnect successful');
      } catch (appKitError) {
        console.warn('⚠️ [EOA] AppKit disconnect failed:', appKitError);
      }

      // Then try wagmi disconnect for any remaining connections
      try {
        await wagmiDisconnect();
        console.log('✅ [EOA] Wagmi disconnect successful');
      } catch (wagmiError) {
        console.warn('⚠️ [EOA] Wagmi disconnect failed:', wagmiError);
      }

      // Force disconnect any remaining EOA connections
      for (const conn of eoaConnections) {
        try {
          console.log('🔌 [EOA] Force disconnecting:', conn.connector.id);
          await conn.connector.disconnect();
          console.log('✅ [EOA] Force disconnect successful:', conn.connector.id);
        } catch (forceError) {
          console.error('❌ [EOA] Force disconnect failed:', conn.connector.id, forceError);
        }
      }

      // Clear primary state
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PRIMARY_EOA_KEY);
        localStorage.removeItem(PRIMARY_EOA_CONNECTOR_KEY);
      }

      console.log('✅ [EOA] EOA disconnect completed');
    } catch (error) {
      console.error('❌ [EOA] EOA disconnect failed:', error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  };

  /**
   * Switch to a different network
   */
  const switchNetwork = async (chainId: number) => {
    try {
      console.log('🔄 [EOA] Switching to network:', chainId);
      await switchChain({ chainId });
      console.log('✅ [EOA] Network switch successful');
    } catch (error) {
      console.error('❌ [EOA] Network switch failed:', error);
      throw error;
    }
  };

  /**
   * Set EOA as primary wallet
   */
  const setPrimary = () => {
    if (typeof window !== 'undefined' && connectorId) {
      localStorage.setItem(PRIMARY_EOA_KEY, 'true');
      localStorage.setItem(PRIMARY_EOA_CONNECTOR_KEY, connectorId);
      console.log('✅ [EOA] Set EOA as primary wallet:', connectorId);
    }
  };

  /**
   * Check if EOA is primary wallet
   */
  const isPrimary = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(PRIMARY_EOA_KEY) === 'true';
    }
    return false;
  };

  /**
   * Get total count of connected EOA wallets
   */
  const getTotalWalletCount = () => {
    return eoaConnections.length;
  };

  return {
    // Connection state
    isConnected,
    address,
    chainId,
    connectorId,
    connectorName,
    isDisconnecting,
    
    // Available options
    eoaConnectors,
    eoaConnections,
    
    // Actions
    connect: connectWallet,
    disconnect,
    switchNetwork,
    setPrimary,
    isPrimary: isPrimary(),
    
    // Utilities
    getTotalWalletCount,
    
    // Raw wagmi hooks (for advanced usage)
    wagmiAccount,
    connectors,
  };
}

