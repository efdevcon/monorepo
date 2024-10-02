import { createContext, useContext } from 'react'
import { UserAccount } from 'types/UserAccount'
import { Session } from 'types/Session'
import { VerificationToken } from 'types/VerificationToken'

export interface AccountContextType {
  edit: boolean
  loading: boolean
  account: UserAccount | undefined
  getToken: (identifier: string, update: boolean) => Promise<VerificationToken | undefined>
  loginWeb3: (address: string, nonce: number, message: string, signature: string) => Promise<UserAccount | undefined>
  loginEmail: (email: string, nonce: number) => Promise<UserAccount | undefined>
  loginToken: (nonce: number) => Promise<UserAccount | undefined>
  logout: (id: string) => Promise<boolean>
  getAccount: () => Promise<UserAccount | undefined>
  updateAccount: (id: string, account: UserAccount) => Promise<boolean>
  deleteAccount: (id: string) => Promise<boolean>
  setSpeakerFavorite: (speakerId: string, remove: boolean, account?: UserAccount) => void
  setSessionBookmark: (
    session: Session,
    level: 'attending' | 'interested',
    account?: UserAccount,
    remove?: boolean
  ) => void
  toggleScheduleSharing: (account: UserAccount) => void
  toggleNotifications: (account: UserAccount) => void
  showLoginRequired?: boolean
  setShowLoginRequired?: React.Dispatch<React.SetStateAction<boolean>>
}

export const useAccountContext = () => useContext<AccountContextType>(AccountContext)
export const AccountContext = createContext<AccountContextType>({
  edit: false,
  loading: false,
  account: undefined,
  getToken: async () => undefined,
  loginWeb3: async () => undefined,
  loginEmail: async () => undefined,
  loginToken: async () => undefined,
  logout: async () => false,
  getAccount: async () => undefined,
  updateAccount: async () => false,
  deleteAccount: async () => false,
  setSpeakerFavorite: () => {},
  setSessionBookmark: () => {},
  toggleScheduleSharing: () => {},
  toggleNotifications: () => {},
})
