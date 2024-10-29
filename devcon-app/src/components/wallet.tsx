'use client'

import { Button } from 'lib/components/button'
import { useAppKit } from '@reown/appkit/react'

export function TestWalletConnections() {
  const { open } = useAppKit()

  return (
    <>
      <p>
        <w3m-button />
      </p>
      <p>
        <Button
          fat
          fill
          className="w-full plain mt-4"
          color="purple-2"
          onClick={(e: any) => {
            e.preventDefault()
            // Add a small delay to avoid cross-origin issues
            setTimeout(() => {
              open()
            }, 0)
          }}
        >
          Continue With Ethereum
        </Button>
      </p>
    </>
  )
}
