'use client';

import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  generateSessionToken,
  formatAddressesForToken,
} from '@/utils/coinbase';
import Icon from '@mdi/react';
import {
  mdiInformation,
  mdiClose,
  mdiChevronLeft,
  mdiArrowTopRight,
  mdiContentCopy,
  mdiCheck,
} from '@mdi/js';
import Link from 'next/link';
import React from 'react';

// Image assets
const imgOnrampDigital = '/images/onramp-digital.svg';
const imgOnrampCash = '/images/onramp-cash.svg';
const imgLocationOn = '/images/imgLocation.svg';

// Provider types
type ProviderBase = {
  name: string;
  description: string | React.ReactNode;
  gradient: string;
  logoImage: string;
  fees: string;
  showPassword?: boolean;
};

type ProviderWithOnClick = ProviderBase & {
  onClick: () => void;
};

type ProviderWithHref = ProviderBase & {
  href: string;
};

type Provider = ProviderWithOnClick | ProviderWithHref;

export default function OnrampTab() {
  const { address } = useWallet();
  const router = useRouter();
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Detect device type for dynamic URLs
  const getDeviceStoreUrl = () => {
    if (typeof window === 'undefined') return '';
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isMacOS = /macintosh|mac os x/.test(userAgent);

    const androidAppUrl = `https://play.google.com/store/apps/details?id=com.zkp2p.mobile.dev`;
    const iosAppUrl = `https://apps.apple.com/app/peer-crypto-wallet/id6749191100`;

    return isIOS || isMacOS ? iosAppUrl : androidAppUrl;
  };

  // Copy password to clipboard
  const handleCopyPassword = async () => {
    const password = 'D3VC0N';
    await navigator.clipboard.writeText(password);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);

    // Create copy icon using MDI
    const copyIcon = React.createElement(Icon, {
      path: mdiContentCopy,
      size: 0.67,
      color: 'white',
    });

    toast.success('Password copied to clipboard', {
      description: password,
      icon: copyIcon,
    });
  };

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
    toast.info(title, {
      description: message,
      duration,
      dismissible: true,
    });
  };

  const showErrorToast = (title: string, message?: string, duration = 4000) => {
    toast.error(title, {
      description: message,
      duration,
      dismissible: true,
    });
  };

  const digitalProviders: Provider[] = [
    {
      name: 'Peanut',
      description:
        'Instant wire transfer, Mercado Pago and quick KYC. No debit/credit cards.',
      gradient:
        'linear-gradient(114.577deg, rgba(255, 145, 233, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'peanut-logo.png',
      fees: 'Low% - Based on rate',
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
          'Peanut Onramp Opened',
          'Complete your purchase in the new tab',
          8000
        );
      },
    },
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

        const ripioUrl = `https://devcon-ramp.ripio.com/?address=${address}&token=USDC&chain=8453`;
        console.log('ripioUrl', ripioUrl);
        popup.location.href = ripioUrl;
        showInfoToast(
          'Ripio Onramp Opened',
          'Complete your purchase in the new tab',
          8000
        );

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
    // {
    //   name: 'Coinbase',
    //   description: 'Zero fees on Base. Requires KYC.',
    //   gradient:
    //     'linear-gradient(114.577deg, rgba(0, 82, 255, 0.2) 52.142%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
    //   logoImage: 'coinbase-logo.png',
    //   fees: '0% – 2.5%',
    //   onClick: async () => {
    //     if (!address) {
    //       showErrorToast(
    //         '❌ No Address Available',
    //         'Please connect your wallet first'
    //       );
    //       return;
    //     }

    //     const popup = window.open(
    //       'about:blank',
    //       '_blank',
    //       'width=470,height=750'
    //     );

    //     if (!popup) {
    //       showErrorToast(
    //         '❌ Popup Blocked',
    //         'Please allow popups for this site'
    //       );
    //       return;
    //     }

    //     try {
    //       const sessionToken = await generateSessionToken({
    //         addresses: formatAddressesForToken(address, ['base']),
    //         assets: ['USDC'],
    //       });

    //       if (!sessionToken) {
    //         throw new Error('Failed to generate session token');
    //       }

    //       const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
    //       const params = new URLSearchParams();
    //       params.append('sessionToken', sessionToken);
    //       params.append('defaultNetwork', 'base');
    //       params.append('defaultExperience', 'send');

    //       const currentDomain = window.location.origin;
    //       const redirectURL = `${currentDomain}/onramp?type=coinbase&confirm=true`;
    //       params.append('redirectURL', redirectURL);

    //       const url = `${baseUrl}?${params.toString()}`;
    //       popup.location.href = url;
    //       showInfoToast(
    //         '🪙 Coinbase Opened',
    //         'Complete your purchase in the new tab'
    //       );
    //     } catch (error) {
    //       console.error('Failed to open Coinbase Onramp:', error);
    //       if (popup && !popup.closed) {
    //         popup.close();
    //       }
    //       showErrorToast(
    //         '❌ Coinbase Error',
    //         'Failed to connect to Coinbase. Please try again.'
    //       );
    //     }
    //   },
    // },
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
      href: getDeviceStoreUrl(),
      showPassword: true,
    },
  ];

  const inPersonProviders = [
    {
      name: 'Ripio',
      description: (
        <>
          <span className="font-bold">Argentinians only</span> via Mercado Pago
          or Bank Transfer, via their unique &apos;Gas&apos; totem!
        </>
      ),
      gradient:
        'linear-gradient(103.512deg, rgba(130, 39, 241, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'ripio-logo.png',
      fees: 'Low% - Based on rate',
      locations: [
        { label: 'Green Pavilion', href: '/map?filter=ripio-green-pavilion' },
        { label: 'The Hub', href: '/map?filter=ripio-the-hub' },
      ],
    },
    {
      name: 'BitBase',
      description:
        'Simple fiat-to-crypto on-ramp with card, or bank transfer. Requires standard KYC.',
      gradient:
        'linear-gradient(103.512deg, rgba(40, 108, 255, 0.2) 51.957%, rgba(255, 255, 255, 0.2) 101.74%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      logoImage: 'bitbase-logo.png',
      fees: 'Based on rate/country',
      locations: [{ label: 'BitBase', href: '/map?filter=bitbase' }],
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
            <Icon path={mdiChevronLeft} size={0.67} color="#36364c" />
          </button>
          <h1 className="text-[#353548] text-lg font-bold tracking-[-0.1px]">
            Add Funds
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Important Disclaimer Banner */}
        <div className="backdrop-blur-sm backdrop-filter bg-[#fff5db] border border-[#ecc791] border-solid rounded-[1px] p-3 flex gap-2">
          <div className="w-6 h-6 flex-shrink-0 mt-0.5">
            <Icon path={mdiInformation} size={1} color="#492e09" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="text-[#492e09] text-sm leading-[1.4] tracking-[0.1px] space-y-1">
              <p className="font-bold">Important Disclaimer</p>
              <p className="font-normal">
                Use of digital exchanges means you will leave the Devconnect App
                and be redirected to a third-party which is not operated,
                controlled by, or under the responsibility of the Ethereum
                Foundation. You proceed at your own risk.
              </p>
            </div>
            <button
              onClick={() => setIsDisclaimerModalOpen(true)}
              className="text-[#0073de] text-sm font-bold hover:underline"
            >
              Read full disclaimer
            </button>
          </div>
        </div>

        {/* Digital Section */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <h2 className="text-[#20202b] text-xl font-bold leading-[1.2] tracking-[-0.1px]">
                Add crypto digitally
              </h2>
              <p className="text-[#353548] text-sm leading-[1.3] tracking-[-0.1px]">
                Providers accept Card and Wire Transfer
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
            {digitalProviders.map((provider, index) => {
              const sharedClassName =
                'w-full border border-[#f0f0f4] rounded p-4 hover:brightness-95 transition-all duration-200 cursor-pointer';
              const content = (
                <div className="flex items-start gap-3">
                  {/* Provider Icon */}
                  <div className="w-8 h-8 rounded-[2px] flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
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

                    {/* Password Section (if showPassword is true) */}
                    {provider.showPassword && (
                      <div className="pt-2 mt-2 border-t border-white/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[#4b4b66] text-xs font-medium">
                            Early Access Password:
                          </span>
                          <code className="text-[#20202b] text-xs font-bold tracking-wider px-2 py-0.5 bg-white/80 rounded border border-white/50">
                            D3VC0N
                          </code>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyPassword();
                            }}
                            className="p-1 hover:bg-white/40 rounded transition-colors"
                            title={
                              passwordCopied
                                ? 'Copied!'
                                : 'Click to copy password'
                            }
                          >
                            {passwordCopied ? (
                              <Icon
                                path={mdiCheck}
                                size={0.6}
                                className="text-green-600"
                              />
                            ) : (
                              <Icon
                                path={mdiContentCopy}
                                size={0.6}
                                className="text-[#4b4b66]"
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chevron Icon */}
                  <div className="w-4 h-4 flex-shrink-0 mt-1">
                    <Icon path={mdiArrowTopRight} size={0.67} color="#0073de" />
                  </div>
                </div>
              );

              return (
                <div
                  key={index}
                  className="w-full border border-[#f0f0f4] rounded"
                  style={{ background: provider.gradient }}
                >
                  {'href' in provider ? (
                    <a
                      href={provider.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 hover:brightness-95 transition-all duration-200"
                    >
                      {content}
                    </a>
                  ) : (
                    <button
                      onClick={provider.onClick}
                      className="w-full text-left p-4 hover:brightness-95 transition-all duration-200"
                    >
                      {content}
                    </button>
                  )}
                </div>
              );
            })}
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
                Providers accept Card and Wire Transfer
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
                  className={`w-8 h-8 rounded-[2px] flex-shrink-0 overflow-hidden`}
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
                      <Link
                        key={locIndex}
                        href={location.href}
                        className="flex-1 bg-white border border-[#1b6fae] rounded-[2px] px-2 py-1 flex flex-col items-center gap-0.5"
                      >
                        <div className="w-5 h-5">
                          <img
                            src={imgLocationOn}
                            alt="Location"
                            className="w-full h-full"
                          />
                        </div>
                        <div className="text-[#0073de] text-xs font-bold text-center tracking-[-0.1px] leading-[1.3]">
                          {location.label}
                        </div>
                      </Link>
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
            <Icon path={mdiInformation} size={1} color="#492e09" />
          </div>
          <div className="flex-1 text-[#492e09] text-sm leading-[1.4] tracking-[0.1px]">
            <div className="font-bold mb-1">Need help?</div>
            <div className="font-normal">
              Head to the{' '}
              <Link
                href="/map?filter=onboarding"
                className="font-bold text-[#0073de]"
              >
                Onboarding area
              </Link>{' '}
              near the entrance and let one of our volunteer team know about the
              technical issue.
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {isDisclaimerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-[rgba(0,0,0,0.33)]"
            onClick={() => setIsDisclaimerModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white border border-[#c7c7d0] rounded-[4px] w-[353px] max-w-[560px] min-w-[320px] mx-4 pt-4">
            {/* Close Button */}
            <button
              onClick={() => setIsDisclaimerModalOpen(false)}
              className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            >
              <Icon path={mdiClose} size={0.67} color="#36364c" />
            </button>

            {/* Modal Content */}
            <div className="px-6 pt-3 pb-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-[#20202b] text-lg font-bold leading-[1.3]">
                  Using Digital Exchanges:
                  <br />
                  Legal Disclaimer from the Ethereum Foundation
                </h2>
                <p className="text-[#353548] text-sm leading-[1.3]">
                  The use of digital exchanges means you will leave the
                  Devconnect App and be redirected to a third-party which{' '}
                  <span className="font-bold">
                    is not operated or controlled by the Ethereum Foundation
                  </span>
                  .
                </p>
                <p className="text-[#353548] text-sm leading-[1.3]">
                  The Ethereum Foundation is not responsible for the context,
                  security, accuracy, or privacy practices of any third-party
                  site.
                </p>
                <p className="text-[#353548] text-sm leading-[1.3]">
                  <span className="font-bold">We strongly advise you</span> to
                  review the third party&apos;s Terms and Conditions and Privacy
                  Policy before creating an account, providing personal
                  information, or conducting any transactions.
                </p>
                <p className="text-[#353548] text-sm leading-[1.3]">
                  If you decide to access any third party app,{' '}
                  <span className="font-bold">
                    you do so entirely at your own risk
                  </span>
                  . We reserve the right to withdraw any redirection to a third
                  party app without notice.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
