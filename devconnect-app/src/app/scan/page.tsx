'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import QRScanner from '@/components/QRScanner';
import ManualPaymentModal from '@/components/ManualPaymentModal';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

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
  }>;
  checkout_url: string;
}

const PAYMENT_REQUEST_KEY = 'devconnect_payment_request';
const PAYMENT_REQUEST_EXPIRY_KEY = 'devconnect_payment_request_expiry';

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
  }>({
    recipient: '',
    amount: '0.01',
  });
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPara } = useUnifiedConnection();

  // Get cached payment request from localStorage
  const getCachedPaymentRequest = (): PaymentRequest | null => {
    try {
      const cached = localStorage.getItem(PAYMENT_REQUEST_KEY);
      const expiry = localStorage.getItem(PAYMENT_REQUEST_EXPIRY_KEY);

      if (!cached || !expiry) {
        return null;
      }

      // Check if cached data is still valid (24 hours)
      const expiryTime = parseInt(expiry);
      if (Date.now() > expiryTime) {
        // Clear expired data
        localStorage.removeItem(PAYMENT_REQUEST_KEY);
        localStorage.removeItem(PAYMENT_REQUEST_EXPIRY_KEY);
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error('Error reading cached payment request:', error);
      return null;
    }
  };

  // Cache payment request in localStorage
  const cachePaymentRequest = (data: PaymentRequest) => {
    try {
      // Cache for 24 hours
      const expiryTime = Date.now() + 24 * 60 * 60 * 1000;

      localStorage.setItem(PAYMENT_REQUEST_KEY, JSON.stringify(data));
      localStorage.setItem(PAYMENT_REQUEST_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Error caching payment request:', error);
    }
  };

  // Fetch payment request from API
  const fetchPaymentRequest = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check for cached data first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = getCachedPaymentRequest();
        if (cached) {
          setPaymentRequest(cached);

          // Update prefilled payment data with the first transaction
          if (cached.transactions && cached.transactions.length > 0) {
            const transaction = cached.transactions[0];
            setPrefilledPaymentData({
              recipient: transaction.address,
              amount: cached.amount.toString(),
            });
          }

          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('/api/payment-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data: PaymentRequest = await response.json();
      setPaymentRequest(data);

      // Cache the new data
      cachePaymentRequest(data);

      // Update prefilled payment data with the first transaction
      if (data.transactions && data.transactions.length > 0) {
        const transaction = data.transactions[0];
        setPrefilledPaymentData({
          recipient: transaction.address,
          amount: data.amount.toString(),
        });
      }
    } catch (err) {
      console.error('Error fetching payment request:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch payment request'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payment request on component mount
  useEffect(() => {
    fetchPaymentRequest();
  }, []);

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

  // Function to fetch order status details before opening manual payment
  const fetchOrderStatusDetails = async () => {
    try {
      // Use the current payment request ID if available
      if (paymentRequest?.id) {
        const paymentDetails = await fetchPaymentDetails(paymentRequest.id);
        console.log('Order status details fetched:', paymentDetails);

        // Update prefilled payment data with status information
        if (
          paymentDetails.transactions &&
          paymentDetails.transactions.length > 0
        ) {
          const transaction = paymentDetails.transactions[0];
          setPrefilledPaymentData({
            recipient: transaction.address,
            amount: paymentDetails.amount.toString(),
            orderId: paymentDetails.order_id?.toString(),
            orderStatus: paymentDetails.status,
            orderStatusDetail: paymentDetails.status_detail,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching order status details:', error);
      // Continue with manual payment even if status fetch fails
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

    // Then, try to parse as manual URL
    const paymentRequestId = value.startsWith('https://')
      ? parseManualUrl(value)
      : value;
    if (paymentRequestId) {
      console.log(
        'QR Scanner parsed manual URL, payment request ID:',
        paymentRequestId
      );

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
            amount: paymentDetails.amount.toString(),
            orderId: paymentDetails.order_id?.toString(),
            orderStatus: paymentDetails.status,
            orderStatusDetail: paymentDetails.status_detail,
          });

          setIsManualPaymentOpen(true);
          return;
        } else {
          console.error('No transactions found in payment details');
        }
      } catch (error) {
        console.error('Error processing manual URL:', error);
        // Fall back to opening the URL in a new tab
        window.open(value, '_blank');
        return;
      }
    }

    // If neither EIP-681 nor manual URL, try to open as a regular link
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
          amount: paymentDetails.amount.toString(),
          orderId: paymentDetails.order_id?.toString(),
          orderStatus: paymentDetails.status,
          orderStatusDetail: paymentDetails.status_detail,
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

  if (isLoading) {
    return (
      <PageLayout title="Scan">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-black">Loading payment request...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Scan">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <div className="flex gap-2">
            <Button
              onClick={() => fetchPaymentRequest()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </Button>
            <Button
              onClick={() => fetchPaymentRequest(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Force Refresh
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!paymentRequest) {
    return (
      <PageLayout title="Scan">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-black">No payment request available</div>
        </div>
      </PageLayout>
    );
  }

  console.log('Current prefilledPaymentData:', prefilledPaymentData);

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

        {/* Manual Payment Modal */}
        <ManualPaymentModal
          key={`${prefilledPaymentData.recipient}-${prefilledPaymentData.amount}`}
          isOpen={isManualPaymentOpen}
          onClose={() => setIsManualPaymentOpen(false)}
          isPara={Boolean(isPara)}
          initialRecipient={prefilledPaymentData.recipient}
          initialAmount={prefilledPaymentData.amount}
          orderId={
            prefilledPaymentData.orderId || paymentRequest?.order_id?.toString()
          }
          orderStatus={prefilledPaymentData.orderStatus}
          orderStatusDetail={prefilledPaymentData.orderStatusDetail}
        />
      </div>
    </PageLayout>
  );
}
