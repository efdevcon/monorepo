import React, { ReactNode, useEffect, useState } from 'react'
import { UserAccount } from 'types/UserAccount'
import { AccountContext, AccountContextType } from './account-context'
import { useRouter } from 'next/router'
import { VerificationToken } from 'types/VerificationToken'
import { Session } from 'types/Session'
import { Modal } from 'components/common/modal'
import { Link } from 'components/common/link'
import HeaderLogo from 'components/common/layouts/header/HeaderLogo'
import AppLogoColor from 'assets/images/app-logo-color.png'
import Image from 'next/image'
import css from 'components/domain/app/login-modal.module.scss'
import { APP_CONFIG } from 'utils/config'
import { useAppKit } from '@reown/appkit/react'
import { POD } from '@pcd/pod'

interface AccountContextProviderProps {
  children: ReactNode
}

export const AccountContextProvider = ({ children }: AccountContextProviderProps) => {
  const { close } = useAppKit()
  const router = useRouter()
  const [showLoginRequired, setShowLoginRequired] = useState(false)
  const [context, setContext] = useState<AccountContextType>({
    edit: false,
    loading: true,
    account: undefined,
    getToken,
    loginWeb3,
    loginEmail,
    loginToken,
    logout,
    getAccount,
    updateAccount,
    updateZupassProfile,
    deleteAccount,
    setSpeakerFavorite,
    setSessionBookmark,
    toggleScheduleSharing,
    toggleNotifications,
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
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status === 200) {
      close()
      setContext({ ...context, account: undefined, loading: true })
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

  async function updateZupassProfile(pod: POD): Promise<boolean> {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/zupass/import`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod: pod.toJSON() }),
    }).catch(e => {
      alert('An error occurred. You may be offline, try again later.')
    })

    if (!response) return false

    if (response.status === 200) {
      const { data } = await response.json()
      setContext({ ...context, account: data })
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
      setContext({ ...context, account: undefined, loading: true })
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

    let favorites = account.speakers ?? []

    if (remove) {
      favorites = favorites.filter(i => i !== speakerId)
    } else {
      favorites.push(speakerId)
    }

    const newAccountState = {
      ...account,
      speakers: favorites,
    }

    const success = await updateAccount(account.id, newAccountState)

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

    let sessions = account.sessions ?? []

    if (remove) {
      sessions = sessions.filter(i => i.id !== session.sourceId || level !== i.level)
    } else {
      sessions = [
        ...sessions,
        {
          id: session.sourceId,
          level: level,
          start: new Date(session.start),
          end: new Date(session.end),
        },
      ]
    }

    const newAccountState = {
      ...account,
      sessions: sessions,
    }

    const success = await updateAccount(account.id, newAccountState)

    if (!success) return

    setContext({
      ...context,
      account: newAccountState,
    })
  }

  async function toggleScheduleSharing(account: UserAccount) {
    const newAccountState = {
      ...account,
      publicSchedule: !account.publicSchedule ? true : false,
    }

    const success = await updateAccount(account.id, newAccountState)

    if (!success) return

    setContext({
      ...context,
      edit: true,
      account: newAccountState,
    })
  }

  async function toggleNotifications(account: UserAccount) {
    const newAccountState = {
      ...account,
      notifications: !account.notifications ? true : false,
    }

    const success = await updateAccount(account.id, newAccountState)

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
