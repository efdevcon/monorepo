'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParaWalletConnection } from './useParaWallet';
import { useEOAWalletConnection } from './useEOAWallet';

const PRIMARY_WALLET_TYPE_KEY = 'devconnect_primary_wallet_type';

export type WalletType = 'para' | 'eoa' | null;

/**
 * Wallet Manager
 * Thin coordination layer between Para and EOA wallets
 * No synchronization - just simple switching logic
 */
export function useWalletManager() {
  const para = useParaWalletConnection();
  const eoa = useEOAWalletConnection();
  
  // Load primary wallet type from localStorage
  const [primaryType, setPrimaryTypeState] = useState<WalletType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PRIMARY_WALLET_TYPE_KEY);
      return (saved as WalletType) || null;
    }
    return null;
  });

  // Auto-detect primary wallet if not set
  useEffect(() => {
    if (!primaryType) {
      if (para.isConnected) {
        setPrimaryType('para');
      } else if (eoa.isConnected) {
        setPrimaryType('eoa');
      }
    }
  }, [para.isConnected, eoa.isConnected, primaryType]);

  /**
   * Set primary wallet type
   */
  const setPrimaryType = (type: WalletType) => {
    setPrimaryTypeState(type);
    if (typeof window !== 'undefined') {
      if (type) {
        localStorage.setItem(PRIMARY_WALLET_TYPE_KEY, type);
        console.log('✅ [WALLET_MANAGER] Set primary wallet type:', type);
      } else {
        localStorage.removeItem(PRIMARY_WALLET_TYPE_KEY);
        console.log('✅ [WALLET_MANAGER] Cleared primary wallet type');
      }
    }
    
    // Update individual wallet primary states
    if (type === 'para') {
      para.setPrimary();
    } else if (type === 'eoa') {
      eoa.setPrimary();
    }
  };

  // Determine active wallet
  const isParaActive = primaryType === 'para' && para.isConnected;
  const isEOAActive = primaryType === 'eoa' && eoa.isConnected;

  // Unified connection state
  const isConnected = isParaActive || isEOAActive;
  const address = isParaActive ? para.address : isEOAActive ? eoa.address : null;
  const isPara = isParaActive;
  const chainId = isParaActive ? para.chainId : isEOAActive ? eoa.chainId : null;

  // Debug logging for address changes
  useEffect(() => {
    console.log('🔍 [WALLET_MANAGER] State update:', {
      primaryType,
      isParaActive,
      isEOAActive,
      paraConnected: para.isConnected,
      eoaConnected: eoa.isConnected,
      paraAddress: para.address,
      eoaAddress: eoa.address,
      finalAddress: address,
    });
  }, [primaryType, isParaActive, isEOAActive, para.isConnected, eoa.isConnected, para.address, eoa.address, address]);

  /**
   * Disconnect current active wallet
   */
  const disconnect = async () => {
    console.log('🔌 [WALLET_MANAGER] Disconnecting active wallet:', primaryType);
    
    try {
      if (isParaActive) {
        await para.disconnect();
      } else if (isEOAActive) {
        await eoa.disconnect();
      }
      setPrimaryType(null);
      console.log('✅ [WALLET_MANAGER] Disconnect completed');
    } catch (error) {
      console.error('❌ [WALLET_MANAGER] Disconnect failed:', error);
      throw error;
    }
  };

  /**
   * Disconnect all wallets (Para + EOA)
   */
  const disconnectAll = async () => {
    console.log('🔌 [WALLET_MANAGER] Disconnecting all wallets');
    
    const results = await Promise.allSettled([
      para.isConnected ? para.disconnect() : Promise.resolve(),
      eoa.isConnected ? eoa.disconnect() : Promise.resolve(),
    ]);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const walletType = index === 0 ? 'Para' : 'EOA';
        console.error(`❌ [WALLET_MANAGER] ${walletType} disconnect failed:`, result.reason);
      }
    });

    setPrimaryType(null);
    console.log('✅ [WALLET_MANAGER] Disconnect all completed');
  };

  /**
   * Switch between Para and EOA
   */
  const switchWallet = (type: 'para' | 'eoa') => {
    if (type === 'para' && !para.isConnected) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot switch to Para - not connected');
      return;
    }
    if (type === 'eoa' && !eoa.isConnected) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot switch to EOA - not connected');
      return;
    }
    
    setPrimaryType(type);
    console.log('✅ [WALLET_MANAGER] Switched to:', type);
  };

  /**
   * Switch EOA network (only works for EOA wallets)
   */
  const switchNetwork = async (chainId: number) => {
    if (!isEOAActive) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot switch network - not on EOA wallet');
      return;
    }
    
    await eoa.switchNetwork(chainId);
  };

  /**
   * Get display name for current wallet
   */
  const getWalletDisplayName = () => {
    if (isParaActive) return 'Para';
    if (isEOAActive) return eoa.connectorName || 'Wallet';
    return 'Not connected';
  };

  return {
    // Current active wallet state
    isConnected,
    address,
    isPara,
    chainId,
    primaryType,
    
    // Wallet information
    walletDisplayName: getWalletDisplayName(),
    
    // Individual wallet states
    para,
    eoa,
    
    // Actions
    disconnect,
    disconnectAll,
    switchWallet,
    switchNetwork,
    setPrimaryType,
    
    // Status flags
    isDisconnecting: para.isDisconnecting || eoa.isDisconnecting,
    hasMultipleWallets: para.isConnected && eoa.isConnected,
  };
}

