'use client';

import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  generateSessionToken,
  formatAddressesForToken,
} from '@/utils/coinbase';

export default function OnrampTab() {
  const { address } = useUnifiedConnection();
  const router = useRouter();

  // Generate a valid UUID v4 (required by Ripio API)
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const generateAuthToken = async (externalRef: string): Promise<string> => {
    const response = await fetch('/api/ripio/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ externalRef }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Token generation failed: ${errorData.error || response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('Invalid token response from server');
    }

    return data.access_token;
  };

  // Toast utility functions
  const showInfoToast = (title: string, message?: string, duration = 3000) => {
    toast.info(
      <div className="space-y-1">
        <div className="font-semibold text-blue-800">{title}</div>
        {message && <div className="text-sm text-blue-700">{message}</div>}
      </div>,
      {
        duration,
        dismissible: true,
        closeButton: true,
        style: {
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      }
    );
  };

  const showErrorToast = (title: string, message?: string, duration = 4000) => {
    toast.error(
      <div className="space-y-1">
        <div className="font-semibold text-red-800">{title}</div>
        {message && <div className="text-sm text-red-700">{message}</div>}
      </div>,
      {
        duration,
        dismissible: true,
        closeButton: true,
        style: {
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      }
    );
  };

  const providers = [
    {
      name: 'Coinbase',
      description: 'Best rate, easy, requires KYC',
      gradient:
        'linear-gradient(135deg, rgba(0, 82, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
      logo: 'C',
      logoColor: 'text-blue-600',
      logoImage: 'coinbase-logo.png',
      environment: 'production',
      onClick: async () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

        // Open popup immediately with blank URL
        const popup = window.open(
          'about:blank',
          '_blank',
          'width=470,height=750'
        );

        if (!popup) {
          showErrorToast(
            '❌ Popup Blocked',
            'Please allow popups for this site'
          );
          return;
        }

        try {
          // Generate session token using utility function
          const sessionToken = await generateSessionToken({
            addresses: formatAddressesForToken(address, [
              'base',
              'ethereum',
              'optimism',
            ]),
            assets: ['ETH', 'USDC'],
          });

          if (!sessionToken) {
            throw new Error('Failed to generate session token');
          }

          // Build URL with latest Coinbase Onramp API parameters
          const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
          const params = new URLSearchParams();

          // Required parameters
          params.append('sessionToken', sessionToken);

          // Optional parameters
          params.append('defaultNetwork', 'base');
          params.append('defaultExperience', 'send');

          // Add redirect URL for post-purchase flow
          const currentDomain = window.location.origin;
          const redirectURL = `${currentDomain}/onramp?type=coinbase&confirm=true`;
          params.append('redirectURL', redirectURL);

          const url = `${baseUrl}?${params.toString()}`;
          console.log('Coinbase onramp URL:', url);

          // Navigate popup to the actual URL
          popup.location.href = url;
          showInfoToast(
            '🪙 Coinbase Opened',
            'Complete your purchase in the new tab'
          );
        } catch (error) {
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

          showErrorToast(
            '❌ Coinbase Error',
            'Failed to connect to Coinbase. Please try again.'
          );
        }
      },
      docs: 'https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-onramp-url',
    },
    {
      name: 'Transak',
      description: 'Good rate, easy, light KYC',
      gradient:
        'linear-gradient(135deg, rgba(52, 138, 237, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
      logo: 'T',
      logoColor: 'text-green-600',
      logoImage: 'transak-logo.png',
      environment: 'staging',
      onClick: () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

        const currentDomain = window.location.origin;
        const transakUrl = `https://global-stg.transak.com/?environment=STAGING&defaultFiatAmount=5&defaultFiatCurrency=USD&defaultCryptoCurrency=USDC&network=base&walletAddress=${address}&redirectURL=${encodeURIComponent(currentDomain + '/onramp?type=transak&confirm=true')}&productsAvailed=BUY&theme=dark&colorMode=DARK`;

        window.open(transakUrl, '_blank', 'noopener,noreferrer');
        showInfoToast(
          '🔄 Transak Opened',
          'Complete your purchase in the new tab'
        );
      },
      docs: 'https://dev.moonpay.com/v1.0/docs/credit-cards-testing',
    },
    {
      name: 'Ripio',
      description: 'Argentinians only via Mercado Pago or Bank Transfer',
      gradient:
        'linear-gradient(135deg, rgba(105, 14, 216, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
      logo: 'R',
      logoColor: 'text-yellow-600',
      logoImage: 'ripio-logo.png',
      environment: 'staging',
      onClick: async () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

        // Open popup immediately with blank URL
        const popup = window.open(
          'about:blank',
          '_blank',
          'width=470,height=750'
        );

        if (!popup) {
          showErrorToast(
            '❌ Popup Blocked',
            'Please allow popups for this site'
          );
          return;
        }

        try {
          // Generate a unique external reference for this session (must be UUID v4 for Ripio API)
          const externalRef = generateUUID();

          // Generate authentication token using utility function
          const authToken = await generateAuthToken(externalRef);

          if (!authToken) {
            throw new Error('Failed to generate authentication token');
          }

          // Build the Ripio widget URL with parameters (as per official docs)
          const widgetUrl = new URL(
            'https://b2b-widget-onramp.sandbox.ripio.com'
          );
          widgetUrl.searchParams.set('_to', authToken);
          widgetUrl.searchParams.set('_addr', address);
          widgetUrl.searchParams.set('_net', 'ETHEREUM_SEPOLIA');
          widgetUrl.searchParams.set('_amount', '2100'); // Default amount in ARS
          widgetUrl.searchParams.set('_crypto', 'RTEST');
          widgetUrl.searchParams.set('_tracking_session', externalRef);

          console.log('Opening Ripio onramp:', widgetUrl.toString());

          // Navigate popup to the actual URL
          popup.location.href = widgetUrl.toString();
          showInfoToast(
            '🚀 Ripio Opened',
            'Complete your purchase in the new tab'
          );
        } catch (error) {
          console.error('Failed to open Ripio onramp:', error);

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
                    <p class="error-message">Failed to connect to Ripio. Please try again or refresh the page.</p>
                  </div>
                </body>
              </html>
            `);
          }

          showErrorToast(
            '❌ Ripio Error',
            'Failed to connect to Ripio. Please try again.'
          );
        }
      },
      docs: 'https://docs.ripio.com/widget/on-off-ramp',
    },
    {
      name: 'Meld.io',
      description: 'Advanced, many options available',
      gradient:
        'linear-gradient(135deg, rgba(249, 105, 211, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
      logo: 'M',
      logoColor: 'text-purple-600',
      logoImage: 'meld-logo.png',
      environment: 'production',
      onClick: () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

        const meldUrl = `https://meldcrypto.com/?destinationCurrencyCode=USDC_BASE&walletAddress=${address}&network=8453&sourceAmount=10`;

        window.open(meldUrl, '_blank', 'noopener,noreferrer');
        showInfoToast(
          '🔮 Meld.io Opened',
          'Complete your purchase in the new tab'
        );
      },
    },
    {
      name: 'ZKP2P',
      description: 'Advanced, privacy preserving',
      gradient:
        'linear-gradient(135deg, rgba(254, 138, 103, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
      logo: 'Z',
      logoColor: 'text-indigo-600',
      logoImage: 'zkp2p-logo.png',
      environment: 'production',
      onClick: () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }
        const currentDomain = window.location.origin;

        const zkp2pUrl = `https://www.zkp2p.xyz/swap?referrer=Devconnect+App&referrerLogo=https%3A%2F%2Fpartner-assets.beta.getpara.com%2Ficons%2F7766a9b6-0afd-477e-9501-313f384e3e19%2Fkey-logos%2FDevconnect%2520Project-icon.jpg&callbackUrl=${encodeURIComponent(currentDomain + '/onramp?type=zkp2p&confirm=true')}&inputCurrency=USD&inputAmount=10&toToken=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&recipientAddress=${address}&tab=buy`;

        window.open(zkp2pUrl, '_blank', 'noopener,noreferrer');
        showInfoToast(
          '🔒 zkp2p Opened',
          'Complete your purchase in the new tab'
        );
      },
      docs: 'https://docs.zkp2p.xyz',
    },
  ];

  if (!address) {
    return 'No address found';
  }

  return (
    <div className="bg-[#f6fafe] min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[#eeeeee] px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/wallet')}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="#36364c"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-[#36364c] text-base font-bold tracking-[-0.1px]">
            Digital Exchanges
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4">
        {/* Title Section */}
        <div className="mb-4">
          <h2 className="text-[#242436] text-xl font-bold leading-[1.2] tracking-[-0.1px] mb-2">
            Swap currency for crypto digitally
          </h2>
          <p className="text-[#36364c] text-sm leading-[1.3]">
            Partners accept Debit/Credit card only
          </p>
        </div>

        {/* Provider Cards */}
        <div className="space-y-2 mb-4">
          {providers.map((provider, index) => (
            <button
              key={index}
              onClick={provider.onClick}
              className="w-full border border-[#f0f0f4] rounded p-4 flex items-center gap-3 hover:brightness-75 transition-all duration-200 cursor-pointer"
              style={{ background: provider.gradient }}
            >
              {/* Provider Icon */}
              <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={`/images/${provider.logoImage}`}
                  alt={`${provider.name} logo`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Provider Info */}
              <div className="flex-1 text-left">
                <div className="text-[#242436] text-base font-bold leading-[1.2] tracking-[-0.1px] mb-1">
                  {provider.name}
                </div>
                <div className="text-[#36364c] text-sm leading-[1.3] tracking-[-0.1px] mb-1">
                  {provider.description}
                </div>
                <div className="flex items-center gap-2">
                  {provider.docs && (
                    <a
                      href={provider.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#36364c] hover:text-[#242436] transition-colors underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📚 Documentation
                    </a>
                  )}
                  <div
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      provider.environment === 'production'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {provider.environment === 'production'
                      ? '🚀 PROD'
                      : '🧪 STAGING'}
                  </div>
                </div>
              </div>

              {/* Chevron Icon */}
              <div className="w-4 h-4 flex-shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="#36364c"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Help Banner */}
        <div className="bg-[#fff5db] border border-[#ecc791] rounded p-3">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 flex-shrink-0 mt-0.5">
              <svg
                className="w-6 h-6 text-[#492e09]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-[#492e09] text-sm leading-[1.4] tracking-[0.1px]">
              <div className="font-bold mb-1">Need help?</div>
              <div>
                Contact our support team if you're having trouble with our
                digital exchange options. Alternatively, you can visit our{' '}
                <span className="font-bold underline">
                  in-person exchange page
                </span>{' '}
                to learn more about exchanging currency for crypto in La Rural.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
