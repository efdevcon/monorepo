import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  generateSessionToken,
  formatAddressesForToken,
} from '@/utils/coinbase'

interface OnrampButtonProps {
  address: string
  defaultNetwork?: string
  defaultExperience?: 'send' | 'buy'
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  [key: string]: any
}

const CoinbaseOnrampButton = ({
  address,
  defaultNetwork = 'base',
  defaultExperience = 'send',
  className = '',
  size = 'default',
  variant = 'default',
  ...props
}: OnrampButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleOnClick = () => {
    setIsLoading(true);

    // Open popup immediately with blank URL
    const popup = window.open('about:blank', '_blank', 'width=470,height=750');

    if (!popup) {
      console.error('Failed to open popup - popup blocked');
      setIsLoading(false);
      return;
    }

    // Generate session token using utility function
    generateSessionToken({
      addresses: formatAddressesForToken(address, [
        defaultNetwork,
        'ethereum',
        'optimism',
      ]),
      assets: ['ETH', 'USDC'],
    })
      .then((sessionToken) => {
        if (!sessionToken) {
          throw new Error('Failed to generate session token');
        }

        // Build URL with latest Coinbase Onramp API parameters
        // https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-onramp-url
        const baseUrl = 'https://pay.coinbase.com/buy/select-asset';

        const params = new URLSearchParams();

        // Required parameters
        params.append('sessionToken', sessionToken);

        // Optional parameters
        if (defaultNetwork) {
          params.append('defaultNetwork', defaultNetwork);
        }

        if (defaultExperience) {
          params.append('defaultExperience', defaultExperience);
        }

        // Add redirect URL for post-purchase flow
        const currentDomain = window.location.origin;
        const redirectURL = `${currentDomain}/onramp?type=coinbase&confirm=true`;
        params.append('redirectURL', redirectURL);

        const url = `${baseUrl}?${params.toString()}`;

        console.log('url', url);

        // Navigate popup to the actual URL
        popup.location.href = url;
      })
      .catch((error) => {
        console.error('Failed to open Coinbase Onramp:', error);

        // Show error message in popup
        if (popup && !popup.closed) {
          popup.document.write(`
            <html>
              <head>
                <title>Error</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: #f5f5f5;
                  }
                  .error-container {
                    text-align: center;
                    padding: 2rem;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  .error-title { color: #dc2626; margin-bottom: 1rem; }
                  .error-message { color: #6b7280; }
                </style>
              </head>
              <body>
                <div class="error-container">
                  <h2 class="error-title">Connection Error</h2>
                  <p class="error-message">Failed to connect to Coinbase. Please try again or refresh the page.</p>
                </div>
              </body>
            </html>
          `);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Button
      onClick={handleOnClick}
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
            Onramp via Coinbase
          </span>
        </div>
      )}
    </Button>
  )
}

export default CoinbaseOnrampButton
