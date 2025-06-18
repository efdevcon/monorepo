import React, { ReactNode, useEffect, useState } from 'react'
import { UserAccount } from 'types/UserAccount'
import { AccountContext, AccountContextType } from './account-context'
import { useRouter } from 'next/router'
import { VerificationToken } from 'types/VerificationToken'
import { useAppKit } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'

interface AccountContextProviderProps {
  children: ReactNode
}

export const AccountContextProvider = ({ children }: AccountContextProviderProps) => {
  const { close } = useAppKit()
  const queryClient = useQueryClient()
  const router = useRouter()
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
    const response = await fetch(`${process.env.API_BASE_URL}/account/token`, {
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
    const response = await fetch(`${process.env.API_BASE_URL}/account/login/web3`, {
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
      setContext({ ...context, account: body.data, loading: false })
      return body.data
    }
  }

  async function loginEmail(email: string, nonce: number): Promise<UserAccount | undefined> {
    const response = await fetch(`${process.env.API_BASE_URL}/account/login/email`, {
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
      setContext({ ...context, account: body.data, loading: false })
      return body.data
    }
  }

  async function loginToken(nonce: number): Promise<UserAccount | undefined> {
    const response = await fetch(`${process.env.API_BASE_URL}/account/login/token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nonce: nonce,
      }),
    })

    const body = await response.json()
    if (response.status === 200) {
      setContext({ ...context, account: body.data, loading: false })
      return body.data
    }
  }

  async function logout(): Promise<boolean> {
    const response = await fetch(`${process.env.API_BASE_URL}/account/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status === 200) {
      close()
      await queryClient.invalidateQueries({ queryKey: ['account'] })
      setContext({ ...context, account: undefined, loading: true })
      router.push('/login')
      return true
    }
    return false
  }

  async function getAccount(): Promise<UserAccount | undefined> {
    const response = await fetch(`${process.env.API_BASE_URL}/account`, {
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

  return <AccountContext.Provider value={context}>{children}</AccountContext.Provider>
}
