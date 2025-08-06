'use client';
import { useState, useEffect } from 'react';
import QRScanner from '@/components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
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

export default function WalletPage() {
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    recipient: string;
    amount: string;
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

  // Generate EIP-681 URL from payment request data
  const generateEIP681Url = (paymentData: PaymentRequest) => {
    if (!paymentData.transactions || paymentData.transactions.length === 0) {
      return null;
    }

    const transaction = paymentData.transactions[0];
    const amountInWei = Math.floor(paymentData.amount * 1000000); // USDC has 6 decimals
    const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

    return `ethereum:${usdcContractAddress}@${transaction.chain_id}/transfer?address=${transaction.address}&uint256=${amountInWei}`;
  };

  // Function to parse EIP-681 URL and extract payment data
  const parseEIP681Url = (url: string) => {
    try {
      // Parse the EIP-681 URL format: ethereum:contract@chainId/function?params
      const match = url.match(
        /^ethereum:([^@]+)@(\d+)\/transfer\?address=([^&]+)&uint256=(\d+)$/
      );

      if (match) {
        const [, contractAddress, chainId, recipientAddress, amountWei] = match;

        // Convert wei back to USDC (6 decimals)
        const amountInUSDC = parseInt(amountWei) / 1000000;

        return {
          recipient: recipientAddress,
          amount: amountInUSDC.toString(),
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
      <div className="min-h-screen flex flex-col items-center bg-black pt-8">
        <h1 className="text-white text-2xl mb-4">Wallet</h1>
        <div className="text-white">Loading payment request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-black pt-8">
        <h1 className="text-white text-2xl mb-4">Wallet</h1>
        <div className="text-red-400 mb-4">Error: {error}</div>
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
      <div className="min-h-screen flex flex-col items-center bg-black pt-8">
        <h1 className="text-white text-2xl mb-4">Wallet</h1>
        <div className="text-white">No payment request available</div>
      </div>
    );
  }

  const eip681Url = generateEIP681Url(paymentRequest);
  const transaction = paymentRequest.transactions?.[0];

  console.log('Current prefilledPaymentData:', prefilledPaymentData);

  return (
    <div className="min-h-screen flex flex-col items-center bg-black pt-8">
      <h1 className="text-white text-2xl mb-4">Wallet</h1>
      <div className="flex flex-col items-center justify-center mt-6">
        <QRScanner
          buttonLabel="Scan Payment QR Code"
          onScan={handleQRScan}
          onClose={() => {
            console.log('close');
            window.open(paymentRequest.checkout_url, '_blank');
          }}
        />
      </div>

      {/* Manual Payment Button */}
      <div className="mt-6">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 cursor-pointer bg-white text-black hover:bg-gray-100"
          onClick={() => setIsManualPaymentOpen(true)}
        >
          <CreditCard className="h-4 w-4" />
          Pay
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center mt-6">
        {/* Generate a QR Code with EIP-681 payment request */}
        {eip681Url && (
          <QRCodeSVG
            value={eip681Url}
            title={'Payment QR Code'}
            size={180}
            bgColor={'#000000'}
            fgColor={'#ffffff'}
            level={'H'}
            imageSettings={{
              src: 'https://www.pagar.simplefi.tech/icon.png',
              x: undefined,
              y: undefined,
              height: 24,
              width: 24,
              opacity: 1,
              excavate: true,
            }}
          />
        )}
        <p className="text-white text-sm mt-2 text-center">
          Amount: ${paymentRequest.amount} {paymentRequest.currency}
          <br />
          Address: {transaction?.address || 'N/A'}
          <br />
          Chain: Base ({transaction?.chain_id || 'N/A'})
          <br />
          Order ID: {paymentRequest.order_id}
          <br />
          <Button
            variant="outline"
            onClick={() => fetchPaymentRequest(true)}
            className="text-black cursor-pointer"
          >
            New order
          </Button>
          <br />
          <button
            onClick={() => {
              window.open(`${paymentRequest.checkout_url}/process`, '_blank');
            }}
            className="text-blue-400 hover:text-blue-300 underline mt-2 cursor-pointer"
          >
            Checkout link
          </button>
        </p>
      </div>

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        key={`${prefilledPaymentData.recipient}-${prefilledPaymentData.amount}`}
        isOpen={isManualPaymentOpen}
        onClose={() => setIsManualPaymentOpen(false)}
        isPara={Boolean(isPara)}
        initialRecipient={prefilledPaymentData.recipient}
        initialAmount={prefilledPaymentData.amount}
      />
    </div>
  );
}
