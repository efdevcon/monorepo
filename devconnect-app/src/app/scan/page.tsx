'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import QRScanner from '@/components/QRScanner';
import PaymentModal from '@/components/PaymentModal';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { PAYMENT_CONFIG } from '@/config/config';
import { MERCHANTS } from '@/config/merchants';

interface PaymentRequest {
  id: string;
  order_id: number;
  amount: number;
  currency: string;
  transactions: Array<{
    id: string;
    coin: string;
    chain_id: number;
    address: string;
    status: string;
    price_details?: {
      final_amount: number;
      currency: string;
      currency_amount: number;
      currency_final_amount: number;
      base_amount: number;
      paid_amount: number;
      discount_rate: number;
      rate: number;
    };
  }>;
  checkout_url: string;
  status?: string;
  status_detail?: string;
  usd_amount?: number;
  expiration_time?: string;
}

export default function ScanPage() {
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [manualPaymentRequestId, setManualPaymentRequestId] = useState('');
  const [isLoadingManualPayment, setIsLoadingManualPayment] = useState(false);
  const [manualPaymentError, setManualPaymentError] = useState<string | null>(
    null
  );
  const [paymentRequestId, setPaymentRequestId] = useState<string>('');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [isLoadingMerchantPayment, setIsLoadingMerchantPayment] =
    useState(false);
  const [merchantPaymentError, setMerchantPaymentError] = useState<
    string | null
  >(null);
  const { isPara } = useWallet();

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

  // Function to parse manual checkout URL and extract payment request ID
  const parseManualUrl = (url: string) => {
    try {
      // Parse manual URL format: https://www.pagar.simplefi.tech/merchant_id/payment/payment_request_id
      const match = url.match(
        /^https:\/\/www\.pagar\.simplefi\.tech\/[^\/]+\/payment\/([a-f0-9]+)$/
      );

      if (match) {
        const [, paymentRequestId] = match;
        return paymentRequestId;
      }

      return null;
    } catch (error) {
      console.error('Error parsing manual URL:', error);
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
    const eip681Data = parseEIP681Url(value);
    if (eip681Data) {
      console.log('QR Scanner parsed EIP-681 data:', eip681Data);
      // For EIP-681 URLs, we don't have a payment request ID, so open as regular link
      window.open(value, '_blank');
      return;
    }

    // Then, try to parse as SimpleFi merchant URL
    const simpleFiMerchantUrl = parseSimpleFiMerchantUrl(value);
    if (simpleFiMerchantUrl) {
      console.log('QR Scanner parsed SimpleFi merchant URL:', simpleFiMerchantUrl);
      setPaymentRequestId(simpleFiMerchantUrl); // Pass the full URL to PaymentModal
      setIsManualPaymentOpen(true);
      return;
    }

    // Then, try to parse as manual URL or payment request ID
    const parsedPaymentRequestId = value.startsWith('https://')
      ? parseManualUrl(value)
      : value;
    if (parsedPaymentRequestId) {
      console.log(
        'QR Scanner parsed payment request ID:',
        parsedPaymentRequestId
      );
      setPaymentRequestId(parsedPaymentRequestId);
      setIsManualPaymentOpen(true);
      return;
    }

    // If neither EIP-681 nor payment request ID, try to open as a regular link
    console.log('Opening as regular link:', value);
    window.open(value, '_blank');
  };

  // Function to handle manual payment request ID submission
  const handleManualPaymentRequest = async () => {
    if (!manualPaymentRequestId.trim()) {
      setManualPaymentError('Please enter a payment request ID');
      return;
    }

    setPaymentRequestId(manualPaymentRequestId.trim());
    setIsManualPaymentOpen(true);
    setManualPaymentRequestId(''); // Clear the input
    setManualPaymentError(null);
  };

  // Function to handle merchant payment request
  const handleMerchantPaymentRequest = async () => {
    if (!selectedMerchant) {
      setMerchantPaymentError('Please select a merchant');
      return;
    }

    setIsLoadingMerchantPayment(true);
    setMerchantPaymentError(null);

    try {
      const response = await fetch(
        `/api/payment-request/last/${selectedMerchant}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            'No payment available for this merchant at the moment.'
          );
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment request');
      }

      const paymentRequest = await response.json();

      if (paymentRequest && paymentRequest.id) {
        setPaymentRequestId(paymentRequest.id);
        setIsManualPaymentOpen(true);
        setSelectedMerchant(''); // Clear the selection
      } else {
        throw new Error('No payment request found for this merchant');
      }
    } catch (error) {
      console.error('Error fetching merchant payment request:', error);
      setMerchantPaymentError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch payment request'
      );
    } finally {
      setIsLoadingMerchantPayment(false);
    }
  };

  return (
    <PageLayout title="Scan" hasBackButton={true}>
      <div className="max-w-xl mx-auto flex flex-col items-center p-8">
        {/* Manual Payment Request ID Input */}
        <div className="w-full mt-6 bg-white border border-[#c7c7d0] rounded-[4px] p-4">
          <div className="mb-4">
            <h2 className="text-[#353548] text-base font-bold tracking-[-0.1px]">
              Manual payment request
            </h2>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-white border border-[#ededf0] rounded-[2px] p-3">
              <input
                type="text"
                placeholder="Enter your payment ID"
                value={manualPaymentRequestId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setManualPaymentRequestId(e.target.value)
                }
                className="w-full text-[#868698] text-base font-normal tracking-[-0.1px] focus:outline-none"
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleManualPaymentRequest();
                  }
                }}
              />
            </div>
            <button
              onClick={handleManualPaymentRequest}
              disabled={
                isLoadingManualPayment || !manualPaymentRequestId.trim()
              }
              className="bg-[#0073de] text-white px-4 py-3 rounded-[1px] font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoadingManualPayment ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Get Order'
              )}
            </button>
          </div>

          {/* OR Divider */}
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-[#ededf0]"></div>
            <div className="px-2">
              <span className="text-[#4b4b66] text-xs font-normal">OR</span>
            </div>
            <div className="flex-1 h-px bg-[#ededf0]"></div>
          </div>

          {/* Merchant Selection */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <select
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                className="w-full bg-white border border-[#ededf0] rounded-[2px] px-4 py-3 text-base font-normal tracking-[-0.1px] appearance-none cursor-pointer focus:outline-none focus:border-[#0073de]"
              >
                <option value="" className="text-[#868698]">
                  Select merchant
                </option>
                {Object.values(MERCHANTS).map((merchant) => (
                  <option
                    key={merchant.id}
                    value={merchant.id}
                    className="text-[#353548]"
                  >
                    [{merchant.posNumber}] {merchant.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="#868698"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <button
              onClick={handleMerchantPaymentRequest}
              disabled={isLoadingMerchantPayment || !selectedMerchant}
              className="bg-[#0073de] text-white px-4 py-3 rounded-[1px] font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoadingMerchantPayment ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Get Order'
              )}
            </button>
          </div>

          {merchantPaymentError && (
            <div className="text-red-600 text-sm mt-3">
              {merchantPaymentError}
            </div>
          )}

          {manualPaymentError && (
            <div className="text-red-600 text-sm mt-3">
              {manualPaymentError}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center mt-6">
          <QRScanner
            buttonLabel="Scan Payment QR Code"
            onScan={handleQRScan}
            onClose={() => {
              console.log('close');
              // window.open(paymentRequest.checkout_url, '_blank');
            }}
            autoOpen={true}
          />
        </div>

        {/* Manual Payment Button */}
        <div className="mt-6">
          {/* <Button
            variant="outline"
            className="w-full flex items-center gap-2 cursor-pointer text-black"
            onClick={async () => {
              await fetchOrderStatusDetails();
              setIsManualPaymentOpen(true);
            }}
          >
            <CreditCard className="h-4 w-4" />
            Re-open last payment
          </Button> */}
        </div>
        <div className="mt-6">
          <a href="/pos" target="_blank" className="text-blue-600 underline">
            POS Terminal
          </a>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isManualPaymentOpen}
          onClose={() => setIsManualPaymentOpen(false)}
          isPara={Boolean(isPara)}
          paymentRequestId={paymentRequestId}
        />
      </div>
    </PageLayout>
  );
}
