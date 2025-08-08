'use client';
import { useState, useEffect } from 'react';
import QRScanner from '@/components/QRScanner';
import ManualPaymentModal from '@/components/ManualPaymentModal';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
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
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    recipient: string;
    amount: string;
    orderId?: string;
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
        const [, contractAddress, chainId, recipientAddress, amountWei, orderId] = match;

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

  // Handle QR code scan
  const handleQRScan = (value: string) => {
    const parsedData = parseEIP681Url(value);

    if (parsedData) {
      console.log('QR Scanner parsed data:', parsedData);
      setPrefilledPaymentData(parsedData);
      setIsManualPaymentOpen(true);
    } else {
      // If not an EIP-681 URL, try to open it as a regular link
      window.open(value, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-white pt-8">
        <h1 className="text-black text-2xl mb-4">Scan</h1>
        <div className="text-black">Loading payment request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-white pt-8">
        <h1 className="text-black text-2xl mb-4">Scan</h1>
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
    );
  }

  if (!paymentRequest) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-white pt-8">
        <h1 className="text-black text-2xl mb-4">Scan</h1>
        <div className="text-black">No payment request available</div>
      </div>
    );
  }

  console.log('Current prefilledPaymentData:', prefilledPaymentData);

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center bg-white p-8 mt-4 rounded-lg">
      <h1 className="text-black text-2xl">Scan</h1>
      <div className="flex flex-col items-center justify-center mt-4">
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
      {/* <div className="mt-6">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 cursor-pointer text-black"
          onClick={() => setIsManualPaymentOpen(true)}
        >
          <CreditCard className="h-4 w-4" />
          Pay
        </Button>
      </div> */}
      <div className="mt-6">
        <a href='/pos' target="_blank" className="text-blue-600 underline">POS Terminal</a>
      </div>

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        key={`${prefilledPaymentData.recipient}-${prefilledPaymentData.amount}`}
        isOpen={isManualPaymentOpen}
        onClose={() => setIsManualPaymentOpen(false)}
        isPara={Boolean(isPara)}
        initialRecipient={prefilledPaymentData.recipient}
        initialAmount={prefilledPaymentData.amount}
        orderId={prefilledPaymentData.orderId || paymentRequest?.order_id?.toString()}
      />
    </div>
  );
}
