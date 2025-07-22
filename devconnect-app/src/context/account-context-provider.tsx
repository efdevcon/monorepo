'use client'

import React, { ReactNode, useEffect, useState } from 'react'
import { AccountContext, AccountContextType, UserAccount } from './account-context'
import { useDisconnect } from 'wagmi';
import { useAccount } from 'wagmi';

interface AccountContextProviderProps {
  children: ReactNode;
}

const ACCOUNT_STORAGE_KEY = 'devconnect_account';

export const AccountContextProvider = ({ children }: AccountContextProviderProps) => {
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const { address, isConnected } = useAccount();
  const wasConnected = React.useRef(false);

  // Load account from localStorage on mount
  useEffect(() => {
    try {
      const savedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (savedAccount) {
        const parsedAccount = JSON.parse(savedAccount);
        setAccount(parsedAccount);
        console.log('Loaded account from localStorage:', parsedAccount);
      }
    } catch (error) {
      console.error('Failed to load account from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If wallet is connected and SIWE account exists, but addresses don't match, clear SIWE state
    if (
      isConnected &&
      account &&
      address &&
      account.address.toLowerCase() !== address.toLowerCase()
    ) {
      logout();
    }
    // If wallet was previously connected and is now disconnected, clear SIWE state
    if (wasConnected.current && !isConnected && account) {
      logout();
      wasConnected.current = false;
    }
    if (isConnected) {
      wasConnected.current = true;
    }
  }, [isConnected, account, address]);

  async function loginWeb3(address: string): Promise<UserAccount | null> {
    try {
      console.log('loginWeb3 called with address:', address);

      // Skip API call and just save the address locally
      const userAccount: UserAccount = {
        id: address, // Use address as ID
        address: address,
      };

      console.log('Created user account:', userAccount);

      // Save to localStorage
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(userAccount));

      setAccount(userAccount);
      setLoading(false);

      console.log('Account state updated successfully');
      return userAccount;
    } catch (error) {
      console.error('Login failed:', error);
      throw error; // Re-throw to let the component handle it
    }
  }

  async function logout(): Promise<boolean> {
    try {
      console.log('Logout called');

      // Use Wagmi's native disconnect with proper error handling
      try {
        await disconnect();
        console.log('Wagmi disconnect successful');
      } catch (error) {
        // Check if it's the wallet_revokePermissions error
        const errorObj = error as { message?: string; code?: number };
        if (
          errorObj?.message?.includes('wallet_revokePermissions') ||
          errorObj?.code === -32603
        ) {
          console.log(
            'Wallet revoke permissions not supported (this is normal for some wallets)'
          );
        } else {
          console.warn('Wagmi disconnect failed:', error);
        }
        // Continue with logout even if disconnect fails
      }

      // Clear localStorage
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);

      // Clear the account state
      setAccount(null);

      // Set loading to false since we're done
      setLoading(false);

      console.log('Logout completed successfully');
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if there's an error, we should still clear the state
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      setAccount(null);
      setLoading(false);
    }
    return false;
  }

  async function getAccount(): Promise<UserAccount | null> {
    try {
      // Load from localStorage
      const savedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (savedAccount) {
        const parsedAccount = JSON.parse(savedAccount);
        setAccount(parsedAccount);
        setLoading(false);
        return parsedAccount;
      }

      setAccount(null);
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Get account failed:', error);
    }

    setAccount(null);
    setLoading(false);
    return null;
  }

  const contextValue: AccountContextType = {
    loading,
    account,
    loginWeb3,
    logout,
    getAccount,
  };

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  );
};
