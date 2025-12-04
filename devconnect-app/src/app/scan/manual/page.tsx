'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PageLayout from '@/components/PageLayout';
import PaymentModal from '@/components/PaymentModal';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { PAYMENT_CONFIG } from '@/config/config';
import { MERCHANTS } from '@/config/merchants';
import { internalDebuging } from '@/utils/auth';
import { useAccount } from '@getpara/react-sdk';

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
  const router = useRouter();
  const { isPara } = useWallet();
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
  const paraAccount = useAccount();
  const paraEmail = (paraAccount as any)?.embedded?.email || null;

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
          // toast.error(
          //   'No payment available for this merchant at the moment. If the problem persists, ask the merchant to create a new order then report the issue.'
          // );
          throw new Error(
            'No payment available for this merchant at the moment. If the problem persists, ask the merchant to create a new order then report the issue.'
          );
        }
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to fetch payment request');
        throw new Error(errorData.error || 'Failed to fetch payment request');
      }

      const paymentRequest = await response.json();

      if (paymentRequest && paymentRequest.id) {
        console.log('Merchant payment request loaded:', paymentRequest.id);
        setPaymentRequestId(paymentRequest.id);
        setIsManualPaymentOpen(true);
        setSelectedMerchant(''); // Clear the selection
      } else {
        toast.error('No payment request found for this merchant');
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
      <div
        className="flex-1 w-full flex items-center justify-center p-4"
        style={{
          background:
            'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
        }}
      >
        <div className="max-w-xl w-full flex flex-col items-center">
          <div className="w-full bg-white border border-[#c7c7d0] rounded-[4px] p-4">
            <div className="mb-4">
              <h2 className="text-[#353548] text-base font-bold tracking-[-0.1px]">
                Manual payment request
              </h2>
            </div>

            {/* <div className="flex gap-3 mb-4">
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

          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-[#ededf0]"></div>
            <div className="px-2">
              <span className="text-[#4b4b66] text-xs font-normal">OR</span>
            </div>
            <div className="flex-1 h-px bg-[#ededf0]"></div>
          </div> */}

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
                  {Object.values(MERCHANTS).map((merchant) => {
                    if (
                      !merchant?.isPrivate ||
                      (internalDebuging(paraEmail) && merchant?.isPrivate)
                    ) {
                      return (
                        <option
                          key={merchant.id}
                          value={merchant.id}
                          className="text-[#353548]"
                        >
                          {merchant.name}
                        </option>
                      );
                    }
                    return null;
                  })}
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
          {/* <div className="mt-6">
          <a href="/pos" target="_blank" className="text-blue-600 underline">
            POS Terminal
          </a>
        </div> */}

          {/* Payment Modal */}
          <PaymentModal
            isOpen={isManualPaymentOpen}
            onClose={() => setIsManualPaymentOpen(false)}
            isPara={Boolean(isPara)}
            paymentRequestId={paymentRequestId}
          />
        </div>
      </div>
    </PageLayout>
  );
}
