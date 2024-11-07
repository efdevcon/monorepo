'use client'

import { useEffect, useState } from 'react'
import { Button } from 'lib/components/button'
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useSignMessage } from 'wagmi'
import { useAccountContext } from 'context/account-context'
import { createSiweMessage } from 'viem/siwe'
import { useRouter } from 'next/router'

interface Props {
  onError?: (error: string) => void
}

export function WalletLoginButton({ onError }: Props) {
  const { address } = useAccount()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const [state, setState] = useState('')
  const accountContext = useAccountContext()
  const router = useRouter()
  const loggedIn = !!accountContext.account

  const [loginWeb3, setLoginWeb3] = useState(0)

  useEffect(() => {
    async function LoginWithWallet() {
      if (!address || loginWeb3 === 0) {
        onError?.('No address connected')
        return
      }

      let nonce = 0
      let message = ''
      let signature = ''
      onError?.('')

      try {
        setState('Sign Message')
        const token = await accountContext.getToken(address.toLowerCase(), false)
        if (!token) {
          onError?.('Unable to create verification token')
          return
        }

        nonce = token.nonce
        message = createSiweMessage({
          address: address,
          chainId: 1,
          domain: 'app.devcon.org',
          nonce: nonce.toString(),
          statement: `Sign this message to prove you have access to this wallet. This won't cost you anything.`,
          uri: 'https://app.devcon.org/',
          version: '1',
        })
        signature = await signMessageAsync({ message })
      } catch (error) {
        onError?.('Unable to sign message')
        return
      } finally {
        setState('')
      }

      try {
        setState('Connecting...')
        const userAccount = await accountContext.loginWeb3(address.toLowerCase(), nonce, message, signature)
        if (userAccount && userAccount.onboarded) {
          router.push('/')
          return
        }
        if (userAccount && !userAccount.onboarded) {
          router.push('/onboarding')
          return
        }
        if (!userAccount) {
          onError?.('Unable to verify signature')
        }
      } catch (error) {
        onError?.('Unable to login')
      } finally {
        setState('')
      }
    }

    if (address && loginWeb3 > 0) LoginWithWallet()
  }, [address, loginWeb3])

  if (loggedIn) {
    return null
  }

  const connectWeb3AndLogin = async () => {
    if (!address) {
      await open()
    }
    setLoginWeb3(Date.now())
  }

  return (
    <>
      <Button
        fat
        fill
        className="w-full plain mt-4"
        color="purple-2"
        disabled={state !== ''}
        onClick={(e: any) => {
          e.preventDefault()
          setTimeout(() => {
            connectWeb3AndLogin()
          }, 0)
        }}
      >
        {state || 'Continue With Ethereum'}
      </Button>
    </>
  )
}

export default WalletLoginButton
