import { useAppKitAccount } from '@reown/appkit/react';
import { useAccount as useWagmiAccount } from 'wagmi';
import { useAccount as useParaAccount, useWallet as useParaWallet } from '@getpara/react-sdk';

export function useUnifiedConnection() {
  // AppKit connection status
  const appKitAccount = useAppKitAccount();
  
  // Wagmi connection status
  const wagmiAccount = useWagmiAccount();
  
  // Para connection status
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();

  // Determine which connection is active
  const isAppKitConnected = appKitAccount?.isConnected;
  const isWagmiConnected = wagmiAccount?.isConnected;
  const isParaConnected = paraAccount?.isConnected;

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
    
    if (isAppKitConnected && appKitAccount?.address) {
      return {
        type: 'appkit' as const,
        address: appKitAccount.address,
        isConnected: true,
        account: appKitAccount,
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

  return {
    // Unified connection status
    isConnected: activeConnection.isConnected,
    address: activeConnection.address,
    connectionType: activeConnection.type,
    
    // Individual connection statuses
    isAppKitConnected,
    isWagmiConnected,
    isParaConnected,
    
    // Individual account objects
    appKitAccount,
    wagmiAccount,
    paraAccount,
    paraWallet,
    
    // Active connection details
    activeConnection,
    
    // Para wallet for signing
    paraWalletData: paraWallet?.data,
  };
} 
