'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import Icon from '@mdi/react';
import { mdiArrowRight } from '@mdi/js';
import PageLayout from '@/components/PageLayout';
import QRScanner from '@/components/QRScanner';
import PaymentModal from '@/components/PaymentModal';
import { useWallet } from '@/context/WalletContext';
import { poisData } from '@/data/pois';
import { POI } from '@/types/api-data';
import Button from 'lib/components/voxel-button/button';

export default function ScanPage() {
  const router = useRouter();
  const { isPara } = useWallet();
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState<string>('');
  const [isExternalUrlModalOpen, setIsExternalUrlModalOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState<string>('');

  // Function to parse EIP-681 URL and extract payment data
  const parseEIP681Url = (url: string) => {
    try {
      // Parse the EIP-681 URL format: ethereum:contract@chainId/function?params
      // Updated to handle optional orderId parameter
      const match = url.match(
        /^ethereum:([^@]+)@(\d+)\/transfer\?address=([^&]+)&uint256=(\d+)(?:&orderId=(\d+))?$/
      );

      if (match) {
        const [
          ,
          contractAddress,
          chainId,
          recipientAddress,
          amountWei,
          orderId,
        ] = match;

        // Convert wei back to USDC (6 decimals)
        const amountInUSDC = parseInt(amountWei) / 1000000;

        return {
          recipient: recipientAddress,
          amount: amountInUSDC.toString(),
          orderId: orderId || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing EIP-681 URL:', error);
      return null;
    }
  };

  // Function to check if URL is a SimpleFi merchant URL
  const parseSimpleFiMerchantUrl = (url: string): string | null => {
    try {
      // Parse SimpleFi merchant URL format: https://pay.simplefi.tech/merchant-slug
      const match = url.match(/^https:\/\/pay\.simplefi\.tech\/([^\/]+)$/);
      if (match) {
        return url; // Return the full URL to pass to PaymentModal
      }
      return null;
    } catch (error) {
      console.error('Error parsing SimpleFi merchant URL:', error);
      return null;
    }
  };

  // Handle QR code scan
  const handleQRScan = async (value: string) => {
    console.log('QR Scanner received value:', value);

    // First, try to parse as EIP-681 URL
    // const eip681Data = parseEIP681Url(value);
    // if (eip681Data) {
    //   console.log('QR Scanner parsed EIP-681 data:', eip681Data);
    //   // For EIP-681 URLs, we don't have a payment request ID, so open as regular link
    //   window.open(value, '_blank');
    //   router.push('/wallet');
    //   return;
    // }

    // SimpleFi merchant URLs
    const simpleFiMerchantUrl = parseSimpleFiMerchantUrl(value);
    if (simpleFiMerchantUrl) {
      console.log(
        'QR Scanner parsed SimpleFi merchant URL:',
        simpleFiMerchantUrl
      );
      // Extract merchant slug from URL
      const match = simpleFiMerchantUrl.match(
        /^https:\/\/pay\.simplefi\.tech\/([^\/]+)$/
      );
      if (match) {
        const merchantSlug = match[1];
        console.log('Extracted merchant slug:', merchantSlug);

        // Fetch the latest payment request for this merchant
        try {
          const response = await fetch(
            `/api/payment-request/last/${merchantSlug}`
          );

          if (!response.ok) {
            if (response.status === 404) {
              toast.error(
                'No payment available for this merchant at the moment. If the problem persists, ask the merchant to create a new order then report the issue.'
              );
            } else {
              toast.error('Failed to fetch payment request');
            }
            return;
          }

          const paymentRequest = await response.json();
          console.log('Loaded payment request:', paymentRequest.id);

          // Open modal with resolved payment ID
          setPaymentRequestId(paymentRequest.id);
          setIsManualPaymentOpen(true);
        } catch (error) {
          console.error('Error fetching payment request:', error);
          toast.error('Failed to load payment request');
        }
      }
      return;
    }

    // send to address
    // Check if it's an Ethereum address (must be checked BEFORE payment ID)
    if (value?.toLowerCase()?.startsWith('0x') && value.length === 42) {
      console.log('QR Scanner detected Ethereum address:', value);
      if (isPara) {
        // Redirect to send page with prefilled address
        router.push(`/wallet/send?to=${value}`);
        return;
      } else {
        // no send for external wallets
        toast.error('Send is not supported for external wallets', {
          description:
            'Use the send button in your external wallet to send funds.',
          duration: 8000,
        });
        return;
      }
    }

    // external urls
    if (
      value?.toLowerCase()?.startsWith('https://ef-events.notion.site/') ||
      value?.toLowerCase()?.startsWith('https://devconnect.org/faq') ||
      value?.toLowerCase()?.includes('poap.xyz')
    ) {
      console.log('QR Scanner detected external URL:', value);
      // Show modal instead of directly opening
      setExternalUrl(value);
      setIsExternalUrlModalOpen(true);
      return;
    }

    // devconnect qr redirects
    if (value?.toLowerCase()?.startsWith('https://app.devconnect.org/')) {
      console.log('QR Scanner detected Devconnect URL:', value);
      // redirect to the url
      let redirectUrl = value.replace('https://app.devconnect.org/', '/');
      if (redirectUrl?.includes('/qr-code/')) {
        redirectUrl = redirectUrl.replace('/qr-code/', 'qr-code-');
        // see if we have a poi with the same layerName
        const poi = poisData.find((poi: POI) => poi.layerName === redirectUrl);
        if (poi && poi.websiteLink) {
          redirectUrl = poi.websiteLink;
        } else {
          toast.error('Redirect URL not recognized');
          return;
        }
      }
      router.push(redirectUrl);
      return;
    }

    // If nothing matches, show error
    // console.log('QR code not recognized:', value);
    // toast.error('QR code not recognized', {
    //   description: 'Please scan a valid payment QR code or Ethereum address',
    //   duration: 4000,
    // });
    setExternalUrl(value);
    setIsExternalUrlModalOpen(true);
    return;
  };

  return (
    <PageLayout title="Scan" hasBackButton={true}>
      <div
        className="flex-1 w-full flex items-center justify-center p-4"
        style={{
          background:
            'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
        }}
      >
        <div className="max-w-xl w-full flex flex-col items-center justify-center">
          <QRScanner
            buttonLabel="Scan QR Code"
            onScan={handleQRScan}
            onClose={() => {
              router.push('/scan/manual');
            }}
            autoOpen={true}
          />

          {/* Payment Modal */}
          <PaymentModal
            isOpen={isManualPaymentOpen}
            onClose={() => {
              setIsManualPaymentOpen(false);
              router.push('/wallet');
            }}
            isPara={Boolean(isPara)}
            paymentRequestId={paymentRequestId}
          />

          {/* External URL Modal */}
          {isExternalUrlModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-[rgba(234,234,234,1)] mx-4 max-w-md w-full shadow-xl flex flex-col">
                <div className="flex items-center gap-3 p-4 pb-0">
                  <Image
                    src="/images/qr-info.svg"
                    alt="QR Info"
                    width={48}
                    height={48}
                  />
                  <h2 className="font-bold">External URL Detected</h2>
                </div>

                <div className="p-4 mx-4 my-2 mb-0 grow self-stretch bg-[#EAF4FB]">
                  <div className="flex flex-col gap-2 text-sm">
                    <span>This QR code contains the following URL:</span>
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[rgba(0,115,222,1)] font-semibold break-all"
                    >
                      {externalUrl}
                    </a>
                    <span className="mt-2">Would you like to open it?</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-4">
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setIsExternalUrlModalOpen(false);
                      setExternalUrl('');
                      router.push('/wallet');
                    }}
                    className="w-full bg-[#0073de] hover:bg-[#0060c0] px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#005493] flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="text-white text-base font-bold">
                      {externalUrl.toLowerCase().includes('poap.xyz')
                        ? 'Mint POAP'
                        : externalUrl
                              .toLowerCase()
                              .startsWith('https://devconnect.org/faq')
                          ? 'Support FAQ'
                          : externalUrl
                                .toLowerCase()
                                .startsWith('https://ef-events.notion.site/')
                            ? 'Open Notion Documentation'
                            : 'Open External Link'}
                    </span>
                    <Icon
                      path={mdiArrowRight}
                      size={0.67}
                      className="text-white"
                    />
                  </a>
                  <button
                    onClick={() => {
                      setIsExternalUrlModalOpen(false);
                      setExternalUrl('');
                      router.push('/wallet');
                    }}
                    className="w-full bg-[#eaf3fa] hover:bg-[#d8ebf7] px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#595978] transition-colors"
                  >
                    <span className="text-[#44445d] text-base font-bold">
                      Cancel
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
