'use client'

import React, { ReactNode, useEffect, useState } from 'react'
import { AccountContext, AccountContextType, UserAccount } from './account-context'
import { useAppKit } from '@reown/appkit/react'

interface AccountContextProviderProps {
  children: ReactNode
}

export const AccountContextProvider = ({ children }: AccountContextProviderProps) => {
  const { close } = useAppKit()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<UserAccount | null>(null)

  useEffect(() => {
    getAccount()
  }, [])

  async function loginWeb3(address: string): Promise<UserAccount | null> {
    try {
      console.log('loginWeb3 called with address:', address)
      
      // Skip API call and just save the address locally
      const userAccount: UserAccount = {
        id: address, // Use address as ID
        address: address,
      }
      
      console.log('Created user account:', userAccount)
      
      setAccount(userAccount)
      setLoading(false)
      
      console.log('Account state updated successfully')
      return userAccount
    } catch (error) {
      console.error('Login failed:', error)
      throw error // Re-throw to let the component handle it
    }
  }

  async function logout(): Promise<boolean> {
    try {
      console.log('Logout called')
      
      // Close the wallet connection
      close()
      
      // Clear the account state
      setAccount(null)
      
      // Set loading to false since we're done
      setLoading(false)
      
      console.log('Logout completed successfully')
      return true
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if there's an error, we should still clear the state
      setAccount(null)
      setLoading(false)
    }
    return false
  }

  async function getAccount(): Promise<UserAccount | null> {
    try {
      // For now, just return null since we're not persisting the account
      // You could add localStorage persistence here if needed
      setAccount(null)
      setLoading(false)
      return null
    } catch (error) {
      console.error('Get account failed:', error)
    }

    setAccount(null)
    setLoading(false)
    return null
  }

  const contextValue: AccountContextType = {
    loading,
    account,
    loginWeb3,
    logout,
    getAccount,
  }

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  )
}
