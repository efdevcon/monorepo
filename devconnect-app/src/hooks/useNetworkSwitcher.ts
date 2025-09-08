import { useSwitchChain, useChainId, useAccount } from 'wagmi';
import { chains, networkConfig, getNetworkConfig } from '@/config/networks';
import { toast } from 'sonner';
import { useState } from 'react';

export function useNetworkSwitcher() {
  const { switchChain, isPending, error } = useSwitchChain();
  const currentChainId = useChainId();
  const { isConnected } = useAccount();
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);

  const switchToNetwork = async (chainId: number) => {
    if (chainId === currentChainId) {
      toast.info('Already connected to this network');
      return { success: false, message: 'Already connected to this network' };
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return { success: false, message: 'Wallet not connected' };
    }

    setSwitchingTo(chainId);

    try {
      await switchChain({ chainId });
      const network = getNetworkConfig(chainId);
      
      toast.success(`✅ Network Switched - Connected to ${network.name}`, {
        duration: 3000,
        dismissible: true,
        closeButton: true,
      });

      return { success: true, message: `Switched to ${network.name}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Network switch failed:', errorMessage);
      
      // Handle specific error cases
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('User rejected')) {
        userFriendlyMessage = 'Network switch was cancelled by user';
      } else if (errorMessage.includes('Unsupported chain')) {
        userFriendlyMessage = 'This network is not supported by your wallet';
      } else if (errorMessage.includes('Chain not configured')) {
        userFriendlyMessage = 'Network configuration error';
      }
      
      toast.error(`❌ Network Switch Failed - ${userFriendlyMessage}`, {
        duration: 4000,
        dismissible: true,
        closeButton: true,
      });

      return { success: false, message: userFriendlyMessage };
    } finally {
      setSwitchingTo(null);
    }
  };

  const getCurrentNetwork = () => {
    return getNetworkConfig(currentChainId);
  };

  const isSwitchingTo = (chainId: number) => {
    return isPending && switchingTo === chainId;
  };

  return {
    // State
    currentChainId,
    isConnected,
    isPending,
    error,
    switchingTo,
    
    // Actions
    switchToNetwork,
    
    // Utilities
    getCurrentNetwork,
    isSwitchingTo,
    
    // Data
    chains,
    networkConfig
  };
}
