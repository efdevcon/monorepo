// Web3/Wallet functionality temporarily disabled - causing Netlify serverless function issues
// This file is kept for when wallet functionality is re-enabled

import React, { PropsWithChildren } from 'react'

// Placeholder - returns null when wallet is disabled
export const getAppKitModal = () => null

interface Props extends PropsWithChildren {
  cookies?: string
}

// Passthrough provider - just renders children when wallet is disabled
export function Web3Provider(props: Props) {
  return <>{props.children}</>
}
