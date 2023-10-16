import React, { ReactNode, useEffect, useState } from 'react'
import { utils, providers } from 'ethers'
import { UserAccount } from 'types/UserAccount'
import { AccountContext, AccountContextType } from './account-context'
import { getWeb3Modal } from 'utils/web3'
import { SignedMessage } from 'types/SignedMessage'
import { useRouter } from 'next/router'
import { Web3Provider } from '@ethersproject/providers'
import { VerificationToken } from 'types/VerificationToken'
import { Session } from 'types/Session'
import { Modal } from 'components/common/modal'
import { Link } from 'components/common/link'

interface AccountContextProviderProps {
  children: ReactNode
}

export const AccountContextProvider = ({ children }: AccountContextProviderProps) => {
  const router = useRouter()
  const [showLoginRequired, setShowLoginRequired] = useState(false)
  const [context, setContext] = useState<AccountContextType>({
    edit: false,
    loading: true,
    provider: undefined,
    account: undefined,
    connectWeb3,
    signMessage,
    getToken,
    loginWeb3,
    loginEmail,
    logout,
    getAccount,
    updateAccount,
    deleteAccount,
    setSpeakerFavorite,
    setSessionBookmark,
    toggleScheduleSharing,
    showLoginRequired,
    setShowLoginRequired,
  })

  useEffect(() => {
    async function asyncEffect() {
      await getAccount()
    }

    asyncEffect()
  }, [])

  async function connectWeb3(): Promise<providers.Web3Provider | undefined> {
    try {
      const web3Modal = getWeb3Modal()
      if (!web3Modal) {
        console.error('Unable to initialize web3Modal')
        return
      }

      web3Modal.clearCachedProvider()
      const web3 = await web3Modal.connect()
      const provider = new providers.Web3Provider(web3)
      // setContext({ ...context, provider: provider })
      return provider
    } catch (e) {
      console.log('Unable to connect to web3')
      console.error(e)
    }
  }

  async function signMessage(message: string, provider?: Web3Provider): Promise<SignedMessage | undefined> {
    let web3Provider = provider ?? context.provider
    if (!web3Provider) {
      web3Provider = await connectWeb3()
    }
    if (!web3Provider) {
      console.error('Unable to initialize Web3Provider')
      return
    }

    try {
      const signer = web3Provider.getSigner()
      const address = await signer.getAddress()
      let signature = ''

      if ((web3Provider.provider as any).wc) {
        signature = await web3Provider.send('personal_sign', [
          utils.hexlify(utils.toUtf8Bytes(message)),
          address.toLowerCase(),
        ])
      } else {
        signature = await signer.signMessage(message)
      }

      return {
        address,
        message,
        signature,
      } as SignedMessage
    } catch (e) {
      console.log('Unable to sign message')
      console.error(e)
    }
  }

  async function getToken(identifier: string): Promise<VerificationToken | undefined> {
    const response = await fetch('/api/account/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: identifier,
      }),
    })

    if (response.status === 200) {
      const body = await response.json()
      return body.data
    }
  }

  async function loginWeb3(
    address: string,
    nonce: number,
    message: string,
    signature: string
  ): Promise<UserAccount | undefined> {
    const response = await fetch('/api/account/login/web3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: address,
        nonce: nonce,
        msg: message,
        signed: signature,
      }),
    })

    const body = await response.json()
    if (response.status === 200) {
      setContext({ ...context, account: body.data })
      return body.data
    }

    // else: set error/message
  }

  async function loginEmail(email: string, nonce: number): Promise<UserAccount | undefined> {
    const response = await fetch('/api/account/login/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: email,
        nonce: nonce,
      }),
    })

    const body = await response.json()
    if (response.status === 200) {
      setContext({ ...context, account: body.data })
      return body.data
    }
  }

  async function logout(): Promise<boolean> {
    // if (!context.web3Modal) return false // isSSR

    // context.web3Modal.clearCachedProvider()
    const response = await fetch('/api/account/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status === 200) {
      setContext({ ...context, provider: undefined, account: undefined, loading: true })
      router.push('/app/login')
      return true
    }

    // else: set error/message
    return false
  }

  async function getAccount(): Promise<UserAccount | undefined> {
    const response = await fetch('/api/account', {
      method: 'GET',
    })

    if (response.status === 200) {
      const body = await response.json()
      if (body.data) {
        setContext({ ...context, account: body.data, loading: false })
        return body.data
      }
    }

    setContext({ ...context, account: undefined, loading: false })
  }

  async function updateAccount(id: string, account: UserAccount): Promise<boolean> {
    const response = await fetch('/api/account/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    })

    if (response.status === 200) {
      setContext({ ...context, account: account })
      return true
    }

    // else: set error/message
    return false
  }

  async function deleteAccount(id: string): Promise<boolean> {
    const response = await fetch('/api/account/' + id, {
      method: 'DELETE',
    })

    if (response.status === 200) {
      setContext({ ...context, provider: undefined, account: undefined, loading: true })
      router.push('/app/login')
      return true
    }

    // else: set error/message
    return false
  }

  async function setSpeakerFavorite(speakerId: string, remove: boolean, account?: UserAccount) {
    if (!account) {
      setShowLoginRequired(true)

      return
    }

    let favorites = account.appState?.speakers ?? []

    if (remove) {
      favorites = favorites.filter(i => i !== speakerId)
    } else {
      favorites.push(speakerId)
    }

    const newAccountState = {
      ...account,
      appState: {
        ...account.appState,
        speakers: favorites,
      },
    }

    await updateAccount(account._id, newAccountState)
    setContext({
      ...context,
      account: newAccountState,
    })
  }

  async function setSessionBookmark(
    session: Session,
    level: 'interested' | 'attending',
    account?: UserAccount,
    remove?: boolean
  ) {
    if (!account) {
      setShowLoginRequired(true)

      return
    }

    let sessions = account.appState?.sessions ?? []

    if (remove) {
      sessions = sessions.filter(i => i.id !== session.id || level !== i.level)
    } else {
      sessions = [
        ...sessions,
        {
          id: session.id,
          level: level,
          start: new Date(session.start),
          end: new Date(session.end),
        },
      ]
    }

    const newAccountState = {
      ...account,
      appState: {
        ...account.appState,
        sessions: sessions,
      },
    }

    await updateAccount(account._id, newAccountState)

    setContext({
      ...context,
      account: newAccountState,
    })
  }

  async function toggleScheduleSharing(account: UserAccount) {
    const newAccountState = {
      ...account,
      appState: {
        ...account.appState,
        publicSchedule: !account.appState.publicSchedule ? true : false,
      },
    }

    await updateAccount(account._id, newAccountState)

    setContext({
      ...context,
      edit: true,
      account: newAccountState,
    })
  }

  return (
    <AccountContext.Provider value={context}>
      <>
        {children}

        {showLoginRequired && (
          <Modal autoHeight open close={() => setShowLoginRequired(false)}>
            <div>
              <p className="bold clear-bottom-less clear-top-less">
                You need to be logged in to personalize your schedule, track your favorite speakers, and more.
              </p>
              <Link to="/app/login" className="button red">
                Go to login
              </Link>
            </div>
          </Modal>
        )}
      </>
    </AccountContext.Provider>
  )
}
