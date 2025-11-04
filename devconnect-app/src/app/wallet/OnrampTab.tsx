'use client';

import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  generateSessionToken,
  formatAddressesForToken,
} from '@/utils/coinbase';

// Image assets
const imgOnrampDigital = '/images/onramp-digital.svg';
const imgOnrampCash = '/images/onramp-cash.svg';
const imgLocationOn = '/images/imgLocation.svg';

export default function OnrampTab() {
  const { address } = useWallet();
  const router = useRouter();

  // Handle hash-based scrolling on component mount
  useEffect(() => {
    if (window.location.hash === '#in-person') {
      setTimeout(() => {
        const element = document.getElementById('in-person-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

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

  const digitalProviders = [
    {
      name: 'Ripio',
      description: (
        <>
          <span className="font-bold">Argentinians only</span> via Mercado Pago
          or Bank Transfer.
        </>
      ),
      gradient:
        'linear-gradient(110.966deg, rgba(130, 39, 241, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'ripio-logo.png',
      fees: 'Low% - Based on rate',
      onClick: async () => {
        // showErrorToast('❌ Ripio is not available yet');
        // return;
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

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

        const ripioUrl = `https://devcon-ramp.ripio.com/?address=${address}`;
        popup.location.href = ripioUrl;

        // try {
        //   const externalRef = generateUUID();
        //   const authToken = await generateAuthToken(externalRef);

        //   if (!authToken) {
        //     throw new Error('Failed to generate authentication token');
        //   }

        //   const widgetUrl = new URL(
        //     'https://b2b-widget-onramp.sandbox.ripio.com'
        //   );
        //   widgetUrl.searchParams.set('_to', authToken);
        //   widgetUrl.searchParams.set('_addr', address);
        //   widgetUrl.searchParams.set('_net', 'ETHEREUM_SEPOLIA');
        //   widgetUrl.searchParams.set('_amount', '2100');
        //   widgetUrl.searchParams.set('_crypto', 'RTEST');
        //   widgetUrl.searchParams.set('_tracking_session', externalRef);

        //   popup.location.href = widgetUrl.toString();
        //   showInfoToast(
        //     '🚀 Ripio Opened',
        //     'Complete your purchase in the new tab'
        //   );
        // } catch (error) {
        //   console.error('Failed to open Ripio onramp:', error);
        //   if (popup && !popup.closed) {
        //     popup.close();
        //   }
        //   showErrorToast(
        //     '❌ Ripio Error',
        //     'Failed to connect to Ripio. Please try again.'
        //   );
        // }
      },
    },
    {
      name: 'Peanut',
      description: 'Blurb for Peanut.',
      gradient:
        'linear-gradient(114.577deg, rgba(255, 145, 233, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'peanut-logo.png',
      fees: 'Low% - Based on sources',
      onClick: () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

        // Open popup immediately with blank URL (prevents mobile popup blockers)
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

        const peanutUrl = `https://peanut.me/${address}@base`;
        popup.location.href = peanutUrl;
        showInfoToast(
          '🥜 Peanut Opened',
          'Complete your purchase in the new tab'
        );
      },
    },
    {
      name: 'Coinbase',
      description: 'Best rates and easy flow, requires KYC.',
      gradient:
        'linear-gradient(114.577deg, rgba(0, 82, 255, 0.2) 52.142%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'coinbase-logo.png',
      fees: '0% – 2.5%',
      onClick: async () => {
        if (!address) {
          showErrorToast(
            '❌ No Address Available',
            'Please connect your wallet first'
          );
          return;
        }

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

          const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
          const params = new URLSearchParams();
          params.append('sessionToken', sessionToken);
          params.append('defaultNetwork', 'base');
          params.append('defaultExperience', 'send');

          const currentDomain = window.location.origin;
          const redirectURL = `${currentDomain}/onramp?type=coinbase&confirm=true`;
          params.append('redirectURL', redirectURL);

          const url = `${baseUrl}?${params.toString()}`;
          popup.location.href = url;
          showInfoToast(
            '🪙 Coinbase Opened',
            'Complete your purchase in the new tab'
          );
        } catch (error) {
          console.error('Failed to open Coinbase Onramp:', error);
          if (popup && !popup.closed) {
            popup.close();
          }
          showErrorToast(
            '❌ Coinbase Error',
            'Failed to connect to Coinbase. Please try again.'
          );
        }
      },
    },
    // {
    //   name: 'Transak (⚠️ Staging Environment)',
    //   description: 'Good rates, simple flow and light KYC.',
    //   gradient:
    //     'linear-gradient(114.577deg, rgba(52, 138, 237, 0.2) 51.882%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
    //   logoImage: 'transak-logo.png',
    //   fees: '0.99% – 3.99%',
    //   onClick: () => {
    //     // showErrorToast('❌ Transak is not available yet');
    //     // return;
    //     if (!address) {
    //       showErrorToast(
    //         '❌ No Address Available',
    //         'Please connect your wallet first'
    //       );
    //       return;
    //     }

    //     const currentDomain = window.location.origin;
    //     const transakUrl = `https://global-stg.transak.com/?environment=STAGING&defaultFiatAmount=5&defaultFiatCurrency=USD&defaultCryptoCurrency=USDC&network=base&walletAddress=${address}&redirectURL=${encodeURIComponent(currentDomain + '/onramp?type=transak&confirm=true')}&productsAvailed=BUY&theme=dark&colorMode=DARK`;

    //     window.open(transakUrl, '_blank', 'noopener,noreferrer');
    //     showInfoToast(
    //       '🔄 Transak Opened',
    //       'Complete your purchase in the new tab'
    //     );
    //   },
    // },
    {
      name: 'ZKP2P',
      description: 'Advanced users – privacy preserving.',
      gradient:
        'linear-gradient(114.577deg, rgba(254, 138, 103, 0.2) 2.546%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'zkp2p-logo.png',
      fees: 'Based on rate/pool',
      onClick: () => {
        showErrorToast('❌ ZKP2P is not available yet');
        return;
        // if (!address) {
        //   showErrorToast(
        //     '❌ No Address Available',
        //     'Please connect your wallet first'
        //   );
        //   return;
        // }
        // const currentDomain = window.location.origin;
        // const zkp2pUrl = `https://www.zkp2p.xyz/swap?referrer=Devconnect+App&referrerLogo=https%3A%2F%2Fpartner-assets.beta.getpara.com%2Ficons%2F7766a9b6-0afd-477e-9501-313f384e3e19%2Fkey-logos%2FDevconnect%2520Project-icon.jpg&callbackUrl=${encodeURIComponent(currentDomain + '/onramp?type=zkp2p&confirm=true')}&inputCurrency=USD&inputAmount=10&toToken=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&recipientAddress=${address}&tab=buy`;

        // window.open(zkp2pUrl, '_blank', 'noopener,noreferrer');
        // showInfoToast(
        //   '🔒 zkp2p Opened',
        //   'Complete your purchase in the new tab'
        // );
      },
    },
  ];

  const inPersonProviders = [
    {
      name: 'Ripio',
      description: (
        <>
          <span className="font-bold">Argentinians only</span> via Mercado Pago
          or Bank Transfer, via Ripio's unique totem!
        </>
      ),
      gradient:
        'linear-gradient(103.512deg, rgba(130, 39, 241, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'ripio-logo.png',
      fees: 'X%',
      locations: ['Green Pavilion', 'Pista Central'],
    },
    {
      name: 'BitBase',
      description: 'Blurb for Bitbase lorem ipsum dolor sit amet consectetur.',
      gradient:
        'linear-gradient(103.512deg, rgba(40, 108, 255, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'calypso-logo.png',
      fees: 'X%',
      locations: ['Green Pavilion', 'Pista Central'],
      opacity: true,
    },
  ];

  if (!address) {
    return (
      <div className="bg-[#f6fafe] min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-[#242436] text-2xl font-bold tracking-[-0.1px]">
              Connect Your Wallet
            </h1>
            <p className="text-[#36364c] text-base">
              Connect your wallet to add funds
            </p>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-[#165a8d] text-white px-8 py-3 rounded-[4px] font-semibold text-base hover:bg-[#0f4a73] transition-colors cursor-pointer"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-auto"
      style={{
        backgroundImage:
          'linear-gradient(-1.29174e-06deg, rgba(246, 182, 19, 0.15) 6.8662%, rgba(255, 133, 166, 0.15) 14.794%, rgba(152, 148, 255, 0.15) 22.844%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.975%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-[#ededf0] px-5 py-2">
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
          <h1 className="text-[#353548] text-lg font-bold tracking-[-0.1px]">
            Add Funds
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Digital Section */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <h2 className="text-[#20202b] text-xl font-bold leading-[1.2] tracking-[-0.1px]">
                Add crypto digitally
              </h2>
              <p className="text-[#353548] text-sm leading-[1.3] tracking-[-0.1px]">
                Partners accept Debit/Credit card only
              </p>
            </div>
            <div className="w-10 h-10 flex-shrink-0">
              <img
                src={imgOnrampDigital}
                alt="Digital"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Digital Provider Cards */}
          <div className="space-y-2 pt-2">
            {digitalProviders.map((provider, index) => (
              <button
                key={index}
                onClick={provider.onClick}
                className="w-full border border-[#f0f0f4] rounded p-4 flex items-center gap-3 hover:brightness-95 transition-all duration-200 cursor-pointer"
                style={{ background: provider.gradient }}
              >
                {/* Provider Icon */}
                <div className="w-8 h-8 rounded-[2px] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={`/images/${provider.logoImage}`}
                    alt={`${provider.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Provider Info */}
                <div className="flex-1 text-left space-y-1">
                  <div className="text-[#20202b] text-base font-bold leading-[1.2] tracking-[-0.1px]">
                    {provider.name}
                  </div>
                  <div className="text-[#353548] text-sm leading-[1.3] tracking-[-0.1px]">
                    {provider.description}
                  </div>
                  <div className="text-[#4b4b66] text-xs leading-[1.3] tracking-[-0.1px]">
                    <span className="font-bold">Fees:</span> {provider.fees}
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
        </div>

        {/* In-Person Section */}
        <div id="in-person-section" className="space-y-4 scroll-mt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <h2 className="text-[#20202b] text-xl font-bold leading-[1.2] tracking-[-0.1px]">
                Add crypto in-person
              </h2>
              <p className="text-[#353548] text-sm leading-[1.3] tracking-[-0.1px]">
                Partners accept Debit/Credit card only
              </p>
            </div>
            <div className="w-10 h-10 flex-shrink-0">
              <img
                src={imgOnrampCash}
                alt="In-person"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* In-Person Provider Cards */}
          <div className="space-y-3">
            {inPersonProviders.map((provider, index) => (
              <div
                key={index}
                className="border border-[#f0f0f4] rounded p-4 flex gap-3"
                style={{ background: provider.gradient }}
              >
                {/* Provider Icon */}
                <div
                  className={`w-8 h-8 rounded-[2px] flex-shrink-0 overflow-hidden ${provider.opacity ? 'opacity-25' : ''}`}
                >
                  <img
                    src={`/images/${provider.logoImage}`}
                    alt={`${provider.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Provider Info */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="space-y-2">
                    <div className="text-[#20202b] text-base font-bold leading-[1.2] tracking-[-0.1px]">
                      {provider.name}
                    </div>
                    <div className="text-[#353548] text-sm leading-[1.3] tracking-[-0.1px]">
                      {provider.description}
                    </div>
                    <div className="text-[#4b4b66] text-xs leading-[1.3] tracking-[-0.1px]">
                      <span className="font-bold">Fees:</span> {provider.fees}
                    </div>
                  </div>

                  {/* Location Links */}
                  <div className="flex gap-2">
                    {provider.locations.map((location, locIndex) => (
                      <div
                        key={locIndex}
                        className="flex-1 bg-white border border-[#1b6fae] rounded-[2px] px-2 py-1 flex flex-col items-center gap-0.5"
                        onClick={() => {
                          showErrorToast('❌ In-person is not available yet');
                          return;
                        }}
                      >
                        <div className="w-5 h-5">
                          <img
                            src={imgLocationOn}
                            alt="Location"
                            className="w-full h-full"
                          />
                        </div>
                        <div className="text-[#0073de] text-xs font-bold text-center tracking-[-0.1px] leading-[1.3]">
                          {location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Banner */}
        <div className="backdrop-blur-sm backdrop-filter bg-[#fff5db] border border-[#ecc791] rounded-[1px] p-3 flex gap-2">
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
          <div className="flex-1 text-[#492e09] text-sm leading-[1.4] tracking-[0.1px]">
            <div className="font-bold mb-1">Need help?</div>
            <div className="font-normal">
              Contact our support team if you're having trouble with our digital
              exchange options. Alternatively, you can visit our{' '}
              <span className="font-bold underline">
                in-person exchange page
              </span>{' '}
              to learn more about exchanging currency for crypto in La Rural.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

