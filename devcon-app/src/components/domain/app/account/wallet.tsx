// Wallet functionality temporarily disabled - causing Netlify serverless function issues
// This file is kept for when wallet login is re-enabled

import { Button } from 'lib/components/button'

interface Props {
  onError?: (error: string) => void
}

export function WalletLoginButton({ onError }: Props) {
  return (
    <Button
      fat
      fill
      disabled
      className="w-full plain mt-4 opacity-50 cursor-not-allowed"
      color="purple-2"
    >
      Wallet Login Coming Soon
    </Button>
  )
}

export default WalletLoginButton
