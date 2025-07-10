import { createContext, useContext } from 'react'

export interface UserAccount {
  id: string
  address: string
  // Add other account properties as needed
}

export interface AccountContextType {
  loading: boolean
  account: UserAccount | null
  loginWeb3: (address: string) => Promise<UserAccount | null>
  logout: () => Promise<boolean>
  getAccount: () => Promise<UserAccount | null>
}

export const AccountContext = createContext<AccountContextType>({
  loading: false,
  account: null,
  loginWeb3: async () => null,
  logout: async () => false,
  getAccount: async () => null,
})

export const useAccountContext = () => useContext(AccountContext)
