'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import QRScanner from '@/components/QRScanner';
import PaymentModal from '@/components/PaymentModal';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { PAYMENT_CONFIG } from '@/config/config';

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
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    recipient: string;
    amount: string;
    orderId?: string;
    orderStatus?: string;
    orderStatusDetail?: string;
    arsAmount?: number;
    priceDetails?: {
      currency: string;
      currency_amount: number;
      currency_final_amount: number;
      base_amount: number;
      final_amount: number;
      paid_amount: number;
      discount_rate: number;
      rate: number;
    };
    paymentRequestId?: string;
  }>({
    recipient: '',
    amount: '0.01',
  });
  const { isPara } = useUnifiedConnection();

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

  // Function to fetch payment details from payment-status API
  const fetchPaymentDetails = async (paymentRequestId: string) => {
    try {
      const response = await fetch(`/api/payment-status/${paymentRequestId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  };

  // Handle QR code scan
  const handleQRScan = async (value: string) => {
    console.log('QR Scanner received value:', value);

    // First, try to parse as EIP-681 URL
    const eip681Data = parseEIP681Url(value);
    if (eip681Data) {
      console.log('QR Scanner parsed EIP-681 data:', eip681Data);
      setPrefilledPaymentData(eip681Data);
      setIsManualPaymentOpen(true);
      return;
    }

    // Then, try to parse as manual URL or payment request ID
    const paymentRequestId = value.startsWith('https://')
      ? parseManualUrl(value)
      : value;
    if (paymentRequestId) {
      console.log('QR Scanner parsed payment request ID:', paymentRequestId);

      try {
        // Fetch payment details from the API
        const paymentDetails = await fetchPaymentDetails(paymentRequestId);
        console.log('Payment details fetched:', paymentDetails);

        // Extract transaction data from the first transaction
        if (
          paymentDetails.transactions &&
          paymentDetails.transactions.length > 0
        ) {
          const transaction = paymentDetails.transactions[0];

          setPrefilledPaymentData({
            recipient: transaction.address,
            amount:
              transaction.price_details?.final_amount?.toString() ||
              paymentDetails.amount.toString(),
            orderId: paymentDetails.order_id?.toString(),
            orderStatus: paymentDetails.status,
            orderStatusDetail: paymentDetails.status_detail,
            arsAmount: paymentDetails.ars_amount,
            priceDetails: transaction.price_details,
            paymentRequestId: paymentRequestId,
          });

          setIsManualPaymentOpen(true);
          return;
        } else {
          console.log('No transactions found in payment details');
          // Fall back to opening the URL in a new tab
          window.open(
            `${PAYMENT_CONFIG.SIMPLEFI_BASE_URL}/${PAYMENT_CONFIG.MERCHANT_ID}/payment/${value}`,
            '_blank'
          );
          return;
        }
      } catch (error) {
        console.error('Error processing payment request:', error);
        // Fall back to opening the URL in a new tab
        window.open(
          `${PAYMENT_CONFIG.SIMPLEFI_BASE_URL}/${PAYMENT_CONFIG.MERCHANT_ID}/payment/${value}`,
          '_blank'
        );
        return;
      }
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

    try {
      setIsLoadingManualPayment(true);
      setManualPaymentError(null);

      const paymentDetails = await fetchPaymentDetails(
        manualPaymentRequestId.trim()
      );
      console.log('Manual payment details fetched:', paymentDetails);

      // Extract transaction data from the first transaction
      if (
        paymentDetails.transactions &&
        paymentDetails.transactions.length > 0
      ) {
        const transaction = paymentDetails.transactions[0];

        setPrefilledPaymentData({
          recipient: transaction.address,
          amount:
            transaction.price_details?.final_amount?.toString() ||
            paymentDetails.amount.toString(),
          orderId: paymentDetails.order_id?.toString(),
          orderStatus: paymentDetails.status,
          orderStatusDetail: paymentDetails.status_detail,
          arsAmount: paymentDetails.ars_amount,
          priceDetails: transaction.price_details,
          paymentRequestId: manualPaymentRequestId.trim(),
        });

        setIsManualPaymentOpen(true);
        setManualPaymentRequestId(''); // Clear the input after successful fetch
      } else {
        setManualPaymentError('No transactions found for this payment request');
      }
    } catch (error) {
      console.error('Error processing manual payment request:', error);
      setManualPaymentError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch payment details'
      );
    } finally {
      setIsLoadingManualPayment(false);
    }
  };

  return (
    <PageLayout title="Scan">
      <div className="max-w-xl mx-auto flex flex-col items-center p-8">
        {/* Manual Payment Request ID Input */}
        <div className="w-full mt-6 p-4 border border-gray-200 rounded-lg">
          <h2 className="text-lg font-medium text-black mb-3">
            Manual Payment Request
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter payment request ID"
              value={manualPaymentRequestId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setManualPaymentRequestId(e.target.value)
              }
              className="flex-1 h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  handleManualPaymentRequest();
                }
              }}
            />
            <Button
              onClick={handleManualPaymentRequest}
              disabled={isLoadingManualPayment}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoadingManualPayment ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {manualPaymentError && (
            <div className="text-red-600 text-sm mt-2">
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
          key={`${prefilledPaymentData.recipient}-${prefilledPaymentData.amount}`}
          isOpen={isManualPaymentOpen}
          onClose={() => setIsManualPaymentOpen(false)}
          isPara={Boolean(isPara)}
          initialRecipient={prefilledPaymentData.recipient}
          initialAmount={prefilledPaymentData.amount}
          orderId={prefilledPaymentData.orderId}
          orderStatus={prefilledPaymentData.orderStatus}
          orderStatusDetail={prefilledPaymentData.orderStatusDetail}
          arsAmount={prefilledPaymentData.arsAmount}
          priceDetails={prefilledPaymentData.priceDetails}
          paymentRequestId={prefilledPaymentData.paymentRequestId}
        />
      </div>
    </PageLayout>
  );
}
