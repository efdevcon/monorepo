'use client';

import { useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { toast } from 'sonner';
import {
  generateSessionToken,
  formatAddressesForToken,
} from '@/utils/coinbase';

export default function OnrampTab() {
  const { address } = useUnifiedConnection();

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
      description: 'Best rate, simple, fast, requires KYC',
      gradient: 'from-blue-500 to-purple-600',
      hoverGradient: 'hover:from-blue-600 hover:to-purple-700',
      logo: 'C',
      logoColor: 'text-blue-600',
      environment: 'production',
      onClick: async () => {
        if (!address) {
          showErrorToast('❌ No Address Available', 'Please connect your wallet first');
          return;
        }
        
        // Open popup immediately with blank URL
        const popup = window.open('about:blank', '_blank', 'width=470,height=750');
        
        if (!popup) {
          showErrorToast('❌ Popup Blocked', 'Please allow popups for this site');
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
          showInfoToast('🪙 Coinbase Opened', 'Complete your purchase in the new tab');
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
          
          showErrorToast('❌ Coinbase Error', 'Failed to connect to Coinbase. Please try again.');
        }
      },
      docs: 'https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-onramp-url',
    },
    {
      name: 'Transak',
      description: 'Good rate, easy, light KYC',
      gradient: 'from-green-500 to-blue-600',
      hoverGradient: 'hover:from-green-600 hover:to-blue-700',
      logo: 'T',
      logoColor: 'text-green-600',
      environment: 'staging',
      onClick: () => {
        if (!address) {
          showErrorToast('❌ No Address Available', 'Please connect your wallet first');
          return;
        }
        
        const currentDomain = window.location.origin;
        const transakUrl = `https://global-stg.transak.com/?environment=STAGING&defaultFiatAmount=5&defaultFiatCurrency=USD&defaultCryptoCurrency=USDC&network=base&walletAddress=${address}&redirectURL=${encodeURIComponent(currentDomain + '/onramp?type=transak&confirm=true')}&productsAvailed=BUY&theme=dark&colorMode=DARK`;
        
        window.open(transakUrl, '_blank', 'noopener,noreferrer');
        showInfoToast('🔄 Transak Opened', 'Complete your purchase in the new tab');
      },
      docs: 'https://dev.moonpay.com/v1.0/docs/credit-cards-testing',
    },
    {
      name: 'Ripio',
      description: 'Argentinians only',
      gradient: 'from-yellow-500 to-orange-600',
      hoverGradient: 'hover:from-yellow-600 hover:to-orange-700',
      logo: 'R',
      logoColor: 'text-yellow-600',
      environment: 'staging',
      onClick: () => {
        if (!address) {
          showErrorToast('❌ No Address Available', 'Please connect your wallet first');
          return;
        }
        
        // Open popup immediately with blank URL
        const popup = window.open('about:blank', '_blank', 'width=470,height=750');
        
        if (!popup) {
          showErrorToast('❌ Popup Blocked', 'Please allow popups for this site');
          return;
        }

        // For now, redirect to Ripio's sandbox - you can integrate the full API later
        popup.location.href = `https://b2b-widget-onramp.sandbox.ripio.com?walletAddress=${address}`;
        showInfoToast('🚀 Ripio Opened', 'Complete your purchase in the new tab');
      },
      docs: 'https://docs.ripio.com/widget/on-off-ramp',
    },
    {
      name: 'Meld.io',
      description: 'Advanced, many options available',
      gradient: 'from-purple-600 to-purple-800',
      hoverGradient: 'hover:from-purple-700 hover:to-purple-900',
      logo: 'M',
      logoColor: 'text-purple-600',
      environment: 'production',
      onClick: () => {
        if (!address) {
          showErrorToast('❌ No Address Available', 'Please connect your wallet first');
          return;
        }
        
        const meldUrl = `https://meldcrypto.com/?destinationCurrencyCode=USDC_BASE&walletAddress=${address}&network=8453&sourceAmount=10`;
        
        window.open(meldUrl, '_blank', 'noopener,noreferrer');
        showInfoToast('🔮 Meld.io Opened', 'Complete your purchase in the new tab');
      },
    }
  ];

  if (!address) {
    return 'No address found';
  }
  
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Choose Provider
        </h1>
        
        <div className="space-y-4">
          {providers.map((provider, index) => (
            <button 
              key={index}
              onClick={provider.onClick}
              className={`w-full p-4 rounded-xl bg-gradient-to-r ${provider.gradient} text-white ${provider.hoverGradient} transition-all duration-200 flex flex-col cursor-pointer`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <span className={`${provider.logoColor} font-bold text-xl`}>
                      {provider.logo}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-semibold">{provider.name}</div>
                    <div className="text-sm opacity-90">{provider.description}</div>
                  </div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex flex-row self-end items-center justify-center mt-3 space-x-2">
                {provider.docs && (
                  <a
                    href={provider.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white opacity-80 hover:opacity-100 transition-opacity underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📚 Documentation
                  </a>
                )}
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  provider.environment === 'production' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {provider.environment === 'production' ? '🚀 PROD' : '🧪 STAGING'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
