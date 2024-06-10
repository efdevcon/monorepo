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
import HeaderLogo from 'components/common/layouts/header/HeaderLogo'
import AppLogoColor from 'assets/images/app-logo-color.png'
import Image from 'next/image'
import css from 'components/domain/app/login-modal.module.scss'
import { APP_CONFIG } from 'utils/config'

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
    loginToken,
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
      try {
        await getAccount()
      } catch (e) {
        console.log(e, 'Account fetch failed')
      }
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

  async function getToken(identifier: string, update: boolean): Promise<VerificationToken | undefined> {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: identifier,
        update: update,
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
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/login/web3`, {
      method: 'POST',
      credentials: 'include',
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
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/login/email`, {
      method: 'POST',
      credentials: 'include',
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

  async function loginToken(nonce: number): Promise<UserAccount | undefined> {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/login/token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status === 200) {
      setContext({ ...context, provider: undefined, account: undefined, loading: true })
      router.push('/login')
      return true
    }

    // else: set error/message
    return false
  }

  async function getAccount(): Promise<UserAccount | undefined> {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account`, {
      method: 'GET',
      credentials: 'include',
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
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    }).catch(e => {
      alert('An error occurred. You may be offline, try again later.')
    })

    if (!response) return false

    if (response.status === 200) {
      setContext({ ...context, account: account })
      return true
    }

    // else: set error/message
    return false
  }

  async function deleteAccount(id: string): Promise<boolean> {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (response.status === 200) {
      setContext({ ...context, provider: undefined, account: undefined, loading: true })
      router.push('/login')
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

    const success = await updateAccount(account._id, newAccountState)

    if (!success) return

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

    const success = await updateAccount(account._id, newAccountState)

    if (!success) return

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

    const success = await updateAccount(account._id, newAccountState)

    if (!success) return

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
              <div className={css['background']}>
                <HeaderLogo />

                <Image src={AppLogoColor} alt="App logo" />
              </div>
              <p className="bold clear-bottom-less clear-top-less">
                You need to be logged in to personalize (and share) your schedule, track your favorite speakers, and
                more.
              </p>
              <Link to="/login" className="button red">
                Login
              </Link>
            </div>
          </Modal>
        )}
      </>
    </AccountContext.Provider>
  )
}
