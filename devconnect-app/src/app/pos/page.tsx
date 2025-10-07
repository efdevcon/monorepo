'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

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

export default function POSPage() {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeFormat, setQrCodeFormat] = useState<'manual' | 'eip681'>(
    'manual'
  );
  const [copiedPaymentId, setCopiedPaymentId] = useState(false);

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

  // Copy payment ID to clipboard
  const copyPaymentId = async () => {
    if (!paymentRequest?.id) return;

    try {
      await navigator.clipboard.writeText(paymentRequest.id);
      setCopiedPaymentId(true);
      setTimeout(() => setCopiedPaymentId(false), 2000);
    } catch (err) {
      console.error('Failed to copy payment ID:', err);
    }
  };

  // Generate EIP-681 URL from payment request data
  const generateEIP681Url = (paymentData: PaymentRequest) => {
    if (!paymentData.transactions || paymentData.transactions.length === 0) {
      return null;
    }
    console.log('paymentData', paymentData);

    const transaction = paymentData.transactions[0];
    const amountInWei = Math.floor(paymentData.amount * 1000000); // USDC has 6 decimals
    const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

    // Include order ID as a custom parameter
    // const orderIdParam = paymentData.order_id
    //   ? `&orderId=${paymentData.order_id}`
    //   : '';

    return `ethereum:${usdcContractAddress}@${transaction.chain_id}/transfer?address=${transaction.address}&uint256=${amountInWei}`;
  };

  // Generate QR code value based on selected format
  const generateQrCodeValue = (paymentData: PaymentRequest) => {
    if (qrCodeFormat === 'manual') {
      return paymentData.checkout_url;
    } else {
      return generateEIP681Url(paymentData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-white pt-8">
        <h1 className="text-black text-2xl mb-4">POS Terminal</h1>
        <div className="text-black">Loading payment request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-white pt-8">
        <h1 className="text-black text-2xl mb-4">POS Terminal</h1>
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
        <h1 className="text-black text-2xl mb-4">POS Terminal</h1>
        <div className="text-black">No payment request available</div>
      </div>
    );
  }

  const qrCodeValue = generateQrCodeValue(paymentRequest);
  const transaction = paymentRequest.transactions?.[0];

  return (
    <div className="h-fit min-h-screen w-screen bg-[#a969fe] p-8">
      <h1 className="text-black text-3xl font-bold text-center mb-8">
        POS Terminal
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - QR Code */}
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-black text-xl font-semibold mb-4">Scan to Pay</h2>

          {/* QR Code Format Toggle */}
          <div className="mb-4 flex items-center gap-4">
            <label className="text-black text-sm font-medium">QR Format:</label>
            <div className="flex bg-white rounded-lg p-1 border border-gray-300">
              <button
                onClick={() => setQrCodeFormat('manual')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  qrCodeFormat === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setQrCodeFormat('eip681')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  qrCodeFormat === 'eip681'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                EIP-681
              </button>
            </div>
          </div>

          {qrCodeValue && (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <QRCodeSVG
                value={qrCodeValue}
                title={'Payment QR Code'}
                size={280}
                bgColor={'#ffffff'}
                fgColor={'#000000'}
                level={'H'}
                imageSettings={{
                  src: 'https://www.pagar.simplefi.tech/icon.png',
                  x: undefined,
                  y: undefined,
                  height: 28,
                  width: 28,
                  opacity: 1,
                  excavate: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Right Column - Payment Information */}
        <div className="flex flex-col justify-center">
          <h2 className="text-black text-xl font-semibold mb-6">
            Payment Details
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Order ID:</span>
                <span className="text-black font-bold text-lg">
                  {paymentRequest.order_id}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Payment ID:</span>
                <div className="flex items-center gap-2">
                  <span className="text-black font-bold text-sm break-all">
                    {paymentRequest.id}
                  </span>
                  <button
                    onClick={copyPaymentId}
                    className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                    title="Copy Payment ID"
                  >
                    {copiedPaymentId ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Amount:</span>
                <span className="text-black font-bold text-lg">
                  {paymentRequest.amount} {paymentRequest.currency}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-gray-600 font-medium">Address:</span>
                <span className="text-black font-mono font-bold text-sm break-all text-right max-w-[75%]">
                  {transaction?.address || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Chain:</span>
                <span className="text-black font-semibold">
                  Base ({transaction?.chain_id || 'N/A'})
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => fetchPaymentRequest(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white hover:text-white font-semibold py-3 cursor-pointer"
              >
                Generate New Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout iframe */}
      {paymentRequest.checkout_url && (
        <div className="w-full mt-8">
          <h3 className="text-black text-xl font-semibold mb-4 text-center">
            <a
              href={paymentRequest.checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors underline"
            >
              SimpleFi Payment status
            </a>
          </h3>
          <div className="w-full max-w-[899px] h-96 border border-gray-300 rounded-xl overflow-hidden shadow-md mx-auto">
            <iframe
              src={`${paymentRequest.checkout_url}/process`}
              className="w-full h-full"
              title="Checkout"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
}
