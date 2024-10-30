import { useEffect, useState } from 'react'
import { Button } from 'lib/components/button'
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useSignMessage } from 'wagmi'
import { useAccountContext } from 'context/account-context'
import { createSiweMessage } from 'viem/siwe'
import { useRouter } from 'next/router'

export function WalletLoginButton() {
  const { address } = useAccount()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const accountContext = useAccountContext()
  const router = useRouter()
  const loggedIn = !!accountContext.account

  const [loginWeb3, setLoginWeb3] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function LoginWithWallet() {
      if (!address) {
        setError('No address.')
        return
      }

      const token = await accountContext.getToken(address.toLowerCase(), false)
      if (!token) {
        setError('Unable to create verification token')
        return
      }

      const message = createSiweMessage({
        address: address,
        chainId: 1,
        domain: 'app.devcon.org',
        nonce: token.nonce.toString(),
        statement: `Sign this message to prove you have access to this wallet. This won't cost you anything.`,
        uri: 'https://app.devcon.org/',
        version: '1',
      })

      const signature = await signMessageAsync({ message })
      const userAccount = await accountContext.loginWeb3(address.toLowerCase(), token.nonce, message, signature)
      if (userAccount) {
        router.push('/')
      }
      if (!userAccount) {
        setError('Unable to login with web3')
      }
    }

    if (address && loginWeb3) LoginWithWallet()
  }, [address, loginWeb3])

  if (loggedIn) {
    return null
  }

  const connectWeb3AndLogin = async () => {
    if (!address) {
      await open()
    }

    setLoginWeb3(true)
  }

  return (
    <Button fat fill className="w-full plain mt-4" color="purple-2" onClick={connectWeb3AndLogin}>
      Continue With Ethereum
    </Button>
  )
}

export default WalletLoginButton
