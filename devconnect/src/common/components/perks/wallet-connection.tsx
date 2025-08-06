import React from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'

export function WalletConnection() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()

  const handleDisconnect = () => {
    const confirmed = confirm('Are you sure you want to disconnect?')

    if (confirmed) {
      disconnect()
    }
  }

  return (
    <button
      onClick={() => (isConnected ? handleDisconnect() : open())}
      className="bg-[#1B6FAE] text-white text-sm px-2 py-1 self-end font-bold border border-gray-700 border-solid flex items-center gap-1 transform transition-colors duration-300 will-change-transform will-transform"
    >
      {address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
    </button>
  )
}
