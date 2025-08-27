import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  generateSessionToken,
  formatAddressesForToken,
} from '@/utils/coinbase'

interface OneClickBuyButtonProps {
  address: string
  presetCryptoAmount?: number
  presetFiatAmount?: number
  fiatCurrency?: string
  defaultAsset?: string
  defaultPaymentMethod?: string
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  [key: string]: any
}

const CoinbaseOneClickBuyButton = ({
  address,
  presetCryptoAmount = 1,
  presetFiatAmount,
  fiatCurrency = 'USD',
  defaultAsset = 'USDC',
  defaultPaymentMethod = 'CRYPTO_ACCOUNT',
  className = '',
  size = 'default',
  variant = 'default',
  ...props
}: OneClickBuyButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleOneClickBuy = async () => {
    setIsLoading(true)

    try {
      // Generate session token using utility function
      const sessionToken = await generateSessionToken({
        addresses: formatAddressesForToken(address, [
          'base',
          'ethereum',
          'optimism',
        ]),
        assets: [defaultAsset],
      })

      if (!sessionToken) {
        throw new Error('Failed to generate session token')
      }

      // Build One-Click-Buy URL with preset parameters
      // https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-onramp-url
      const baseUrl = 'https://pay.coinbase.com/buy'

      const params = new URLSearchParams()

      // Required parameters
      params.append('sessionToken', sessionToken)
      params.append('defaultAsset', defaultAsset)

      // Add preset amount (either fiat or crypto)
      if (presetFiatAmount) {
        params.append('presetFiatAmount', presetFiatAmount.toString())
        params.append('fiatCurrency', fiatCurrency)
      } else if (presetCryptoAmount) {
        params.append('presetCryptoAmount', presetCryptoAmount.toString())
        params.append('defaultPaymentMethod', defaultPaymentMethod)
      }

      // Add redirect URL for post-purchase flow
      const currentDomain = window.location.origin
      const redirectURL = `${currentDomain}/onramp?type=coinbase&confirm=true`
      params.append('redirectURL', redirectURL)

      const url = `${baseUrl}?${params.toString()}`

      console.log('One-click buy URL:', url)
      window.open(url, '_blank', 'width=470,height=750')
    } catch (error) {
      console.error('Failed to open Coinbase One-Click Buy:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonText = () => {
    if (presetFiatAmount) {
      return `One-click ${presetFiatAmount} ${fiatCurrency} of ${defaultAsset} via Coinbase`
    } else if (presetCryptoAmount) {
      return `One-click ${presetCryptoAmount} ${defaultAsset} via Coinbase`
    }
    return `One-click ${defaultAsset} via Coinbase`
  }

  return (
    <Button
      onClick={handleOneClickBuy}
      disabled={isLoading}
      size={size}
      variant={variant}
      className={`bg-[#0052FF] hover:bg-[#0043d3] text-white ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Loading...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={props.w === '100%' && size === 'lg' ? 'min-w-[180px]' : props.w === '100%' ? 'min-w-[150px]' : ''}>
            {getButtonText()}
          </span>
        </div>
      )}
    </Button>
  )
}

export default CoinbaseOneClickBuyButton
