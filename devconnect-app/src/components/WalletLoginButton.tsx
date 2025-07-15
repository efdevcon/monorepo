'use client'

import { useEffect, useState } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useSignMessage } from 'wagmi'
import { createSiweMessage } from 'viem/siwe'
import { useAccountContext } from '@/context/account-context'

import Button from '@/components/Button'

interface Props {
  onError?: (error: string) => void
}

// Generate a random alphanumeric nonce
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function WalletLoginButton({ onError }: Props) {
  const { address } = useAccount()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const { account, loginWeb3 } = useAccountContext()
  const [state, setState] = useState('')
  const [loginWeb3Trigger, setLoginWeb3Trigger] = useState(0)
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loginWithWallet() {
      if (!address || loginWeb3Trigger === 0) {
        return;
      }

      const nonce = generateNonce();
      let message = '';

      try {
        setState('Sign Message');
        setLoading(true);

        message = createSiweMessage({
          address: address,
          chainId: 1,
          domain: 'app.devconnect.org',
          nonce: nonce,
          statement: `Sign this message to prove you have access to this wallet. This won't cost you anything.`,
          uri: 'https://app.devconnect.org/',
          version: '1',
        });

        console.log('Created SIWE message:', message);

        const signature = await signMessageAsync({ message });
        console.log('Signature received:', signature);

        // Just save the address locally, skip API call
        const result = await loginWeb3(address);
        console.log('Login result:', result);

        // Clear any previous errors since login was successful
        onError?.('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1500);
      } catch (error) {
        console.error('Login error details:', error);
        if (error instanceof Error) {
          onError?.(`Login failed: ${error.message}`);
        } else {
          onError?.('Unable to sign message');
        }
      } finally {
        setState('');
        setLoading(false);
      }
    }

    if (address && loginWeb3Trigger > 0) {
      loginWithWallet();
    }
  }, [address, loginWeb3Trigger, loginWeb3, signMessageAsync, onError]);

  if (account) {
    return null;
  }

  if (loading)
    return (
      <Button className="w-full plain mt-4" type="Primary" disabled>
        Signing in...
      </Button>
    );

  if (success)
    return (
      <Button className="w-full plain mt-4" type="Primary" disabled>
        Signed in!
      </Button>
    );

  const connectWeb3AndLogin = async () => {
    // Always open the wallet selection modal first
    await open();
    // Then trigger the login process
    setLoginWeb3Trigger(Date.now());
  };

  return (
    <Button
      className="w-full plain mt-4"
      type="Primary"
      onClick={() => {
        if (!loading) {
          setTimeout(() => {
            connectWeb3AndLogin();
          }, 0);
        }
      }}
      disabled={loading}
    >
      {state || 'Continue With Ethereum'}
    </Button>
  );
}

export default WalletLoginButton
