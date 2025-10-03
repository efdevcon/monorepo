'use client';

import {
  useAccount as useParaAccount,
  useLogout,
  useWallet as useParaWallet,
} from '@getpara/react-sdk';
import { useState, useEffect } from 'react';

const PRIMARY_PARA_KEY = 'devconnect_para_primary';

/**
 * Para Wallet Hook
 * Manages Para SDK connection independently from wagmi/AppKit
 * No synchronization needed - Para SDK handles everything
 */
export function useParaWalletConnection() {
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();
  const { logout, logoutAsync } = useLogout();
  
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Para connection state
  const isConnected = paraAccount?.isConnected && !!paraWallet?.data?.address;
  const address = paraWallet?.data?.address || null;
  const walletId = paraWallet?.data?.id || null;
  const email = (paraAccount as any)?.embedded?.email || null;

  // Auto-switch to Para when it connects (if no other wallet was primary)
  useEffect(() => {
    if (isConnected && typeof window !== 'undefined') {
      const currentPrimary = localStorage.getItem('devconnect_primary_wallet_type');

      // If no primary wallet is set, automatically make Para primary
      if (!currentPrimary) {
        console.log('🔄 [PARA] Auto-switching to Para (no primary wallet set)');
        localStorage.setItem('devconnect_primary_wallet_type', 'para');
        window.dispatchEvent(new CustomEvent('primaryWalletTypeChange', { detail: 'para' }));
      }
    }
  }, [isConnected]);

  /**
   * Disconnect Para wallet
   * Uses Para SDK logout directly - no wagmi coordination needed
   */
  const disconnect = async () => {
    if (isDisconnecting) {
      console.warn('⚠️ [PARA] Disconnect already in progress');
      return;
    }

    setIsDisconnecting(true);
    console.log('🔌 [PARA] Starting Para disconnect');

    try {
      // Try async logout first
      try {
        await Promise.race([
          logoutAsync({
            clearPregenWallets: false // Keep pregenerated wallets
          }),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Para logout timeout')), 10000)
          )
        ]);
        console.log('✅ [PARA] Async logout successful');
      } catch (asyncError) {
        console.warn('⚠️ [PARA] Async logout failed, trying sync logout:', asyncError);
        logout();
        console.log('✅ [PARA] Sync logout completed');
      }

      // Clear primary state
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PRIMARY_PARA_KEY);
      }

      console.log('✅ [PARA] Para disconnect completed');
    } catch (error) {
      console.error('❌ [PARA] Para disconnect failed:', error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  };

  /**
   * Set Para as primary wallet
   */
  const setPrimary = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRIMARY_PARA_KEY, 'true');
      console.log('✅ [PARA] Set Para as primary wallet');
    }
  };

  /**
   * Check if Para is primary wallet
   */
  const isPrimary = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(PRIMARY_PARA_KEY) === 'true';
    }
    return false;
  };

  return {
    // Connection state
    isConnected,
    address,
    walletId,
    isDisconnecting,
    
    // Para-specific info
    chainId: 8453, // Para is always on Base
    chainName: 'Base',
    email, // Para user email (from embedded wallet)
    
    // Actions
    disconnect,
    setPrimary,
    isPrimary: isPrimary(),
    
    // Raw Para SDK hooks (for advanced usage)
    paraAccount,
    paraWallet,
  };
}

