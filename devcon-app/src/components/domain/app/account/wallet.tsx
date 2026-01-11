'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from 'lib/components/button'
import { useAccountContext } from 'context/account-context'
import { useRouter } from 'next/router'
import { getAppKitModal } from 'context/web3'

interface Props {
  onError?: (error: string) => void
}

export function WalletLoginButton({ onError }: Props) {
  const [state, setState] = useState('')
  const [address, setAddress] = useState<string | undefined>(undefined)
  const accountContext = useAccountContext()
  const router = useRouter()
  const loggedIn = !!accountContext.account
  const [loginWeb3, setLoginWeb3] = useState(0)
  
  // Store wagmi hooks after dynamic load
  const wagmiRef = useRef<{
    useAccount: any
    useSignMessage: any
    createSiweMessage: any
  } | null>(null)
  const [wagmiLoaded, setWagmiLoaded] = useState(false)

  // Load wagmi dynamically
  useEffect(() => {
    const loadWagmi = async () => {
      try {
        const [wagmiModule, viemModule] = await Promise.all([
          import('wagmi'),
          import('viem/siwe'),
        ])
        wagmiRef.current = {
          useAccount: wagmiModule.useAccount,
          useSignMessage: wagmiModule.useSignMessage,
          createSiweMessage: viemModule.createSiweMessage,
        }
        setWagmiLoaded(true)
      } catch (error) {
        console.error('Failed to load wagmi:', error)
      }
    }
    loadWagmi()
  }, [])

  const openAppKit = useCallback(async () => {
    const modal = getAppKitModal()
    if (modal) {
      await modal.open()
    }
  }, [])

  // Poll for address changes when wagmi is loaded
  useEffect(() => {
    if (!wagmiLoaded) return
    
    const checkAddress = async () => {
      try {
        const wagmi = await import('wagmi')
        const config = await import('utils/wallet').then(m => m.wagmiAdapter.wagmiConfig)
        const account = wagmi.getAccount(config)
        setAddress(account.address)
      } catch {
        // Ignore errors during loading
      }
    }
    
    checkAddress()
    const interval = setInterval(checkAddress, 1000)
    return () => clearInterval(interval)
  }, [wagmiLoaded])

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

        // Dynamic import for signing
        const [{ signMessage }, { createSiweMessage }, walletModule] = await Promise.all([
          import('wagmi/actions'),
          import('viem/siwe'),
          import('utils/wallet'),
        ])

        nonce = token.nonce
        message = createSiweMessage({
          address: address as `0x${string}`,
          chainId: 1,
          domain: 'app.devcon.org',
          nonce: nonce.toString(),
          statement: `Sign this message to prove you have access to this wallet. This won't cost you anything.`,
          uri: 'https://app.devcon.org/',
          version: '1',
        })
        signature = await signMessage(walletModule.wagmiAdapter.wagmiConfig, { message })
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
  }, [address, loginWeb3, accountContext, onError, router])

  if (loggedIn) {
    return null
  }

  const connectWeb3AndLogin = async () => {
    if (!address) {
      await openAppKit()
    }
    setLoginWeb3(Date.now())
  }

  return (
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
  )
}

export default WalletLoginButton
