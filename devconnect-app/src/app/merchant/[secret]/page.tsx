'use client';
import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { MERCHANTS, getMerchantById } from '@/config/merchants';
import { internalDebuging } from '@/utils/auth';
import { useAccount } from '@getpara/react-sdk';
import { Button } from '@/components/ui/button';

interface PaymentRequest {
  id: string;
  order_id: number;
  amount: number;
  currency: string;
  merchant_id?: string;
  items?: Array<{
    id: string;
    quantity: number;
    name: string;
    price: number;
    currency: string;
  }>;
  transactions: Array<{
    id: string;
    coin: string;
    chain_id: number;
    address: string;
    status: string;
    tx_hash?: string;
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
    payments?: Array<{
      hash?: string;
      from?: string;
      amount?: number;
      status?: string;
      chain_id?: number;
      paid_at?: string;
    }>;
  }>;
  checkout_url: string;
  status?: string;
  status_detail?: string;
  usd_amount?: number;
  expiration_time?: string;
  payments?: Array<{
    hash?: string;
    from?: string;
    amount?: number;
    chain_id?: number;
    coin?: string;
    paid_at?: string;
  }>;
}

// Helper function to get network name from chain ID
const getNetworkName = (chainId: number): string => {
  const networks: Record<number, string> = {
    1: 'Ethereum',
    8453: 'Base',
    137: 'Polygon',
    10: 'Optimism',
    42161: 'Arbitrum',
    42220: 'Celo',
    480: 'Worldchain',
    900: 'Solana',
    0: 'Lightning Network',
  };
  return networks[chainId] || `Chain ${chainId}`;
};

// Helper function to get block explorer URL
const getExplorerUrl = (chainId: number, txHash: string): string => {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    137: 'https://polygonscan.com/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    42161: 'https://arbiscan.io/tx/',
    42220: 'https://celoscan.io/tx/',
    480: 'https://worldscan.org/tx/',
    900: 'https://solscan.io/tx/',
  };
  return (explorers[chainId] || 'https://etherscan.io/tx/') + txHash;
};

export default function MerchantPage() {
  const params = useParams();
  const [isValidated, setIsValidated] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('69138269ea5ff64e14b83b6f');
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantSlug, setMerchantSlug] = useState<string>('devcon-swag-shop');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [useStatusEndpoint, setUseStatusEndpoint] = useState<boolean>(false);
  
  const paraAccount = useAccount();
  const paraEmail = (paraAccount as any)?.embedded?.email || null;

  // Validate secret on mount
  useEffect(() => {
    const validateSecret = async () => {
      try {
        const response = await fetch(`/api/validate-merchant-secret?secret=${params.secret}`);
        const data = await response.json();
        
        if (data.valid) {
          setIsValidated(true);
        } else {
          notFound();
        }
      } catch (error) {
        console.error('Failed to validate secret:', error);
        notFound();
      }
    };

    validateSecret();
  }, [params.secret]);

  // Fetch payment status by payment ID
  const fetchPaymentStatus = async (paymentId: string, showLoading = false) => {
    if (showLoading) {
      setIsLoadingPayment(true);
      setError(null);
    }

    try {
      const response = await fetch(`/api/payment-status/${paymentId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment status');
      }

      const paymentStatusData: PaymentRequest = await response.json();

      if (paymentStatusData && paymentStatusData.id) {
        console.log('Payment status updated:', paymentStatusData.status, 'for payment:', paymentStatusData.id);
        // Only update the payment request if it matches the current payment ID
        setPaymentRequest(prev => {
          // Don't update if this status is for a different payment
          if (!prev || prev.id !== paymentStatusData.id) {
            console.log('Ignoring status update for old payment:', paymentStatusData.id, 'current:', prev?.id);
            return prev;
          }
          // Merge status data with existing payment data
          return {
            ...prev,
            ...paymentStatusData,
            // Ensure we keep items if they exist in previous state
            items: paymentStatusData.items || prev.items,
          };
        });
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      if (showLoading) {
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch payment status'
        );
      }
    } finally {
      if (showLoading) {
        setIsLoadingPayment(false);
      }
    }
  };

  // Fetch last payment for selected merchant
  const fetchLastPayment = async (merchantIdValue: string, showLoading = true) => {
    if (showLoading) {
      setIsLoadingPayment(true);
      setError(null);
    }

    try {
      const response = await fetch(
        `/api/payment-request/last/${merchantIdValue}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Got 404, switch to status endpoint if we have a payment ID
          if (paymentRequest?.id) {
            console.log('Got 404, switching to status endpoint');
            setUseStatusEndpoint(true);
            return;
          }
          throw new Error(
            'No payment available for this merchant at the moment. Please ask the merchant to create a new order.'
          );
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment request');
      }

      const paymentRequestData: PaymentRequest = await response.json();

      if (paymentRequestData && paymentRequestData.id) {
        // Check if this is a new order (different ID)
        if (paymentRequest?.id && paymentRequestData.id !== paymentRequest.id) {
          console.log('New order detected! Switching from', paymentRequest.id, 'to', paymentRequestData.id);
          // Reset to using last payment endpoint for the new order
          setUseStatusEndpoint(false);
        }
        console.log('Last payment request loaded:', paymentRequestData.id);
        setPaymentRequest(paymentRequestData);
        
        // Update selected merchant if it's in the payment data and different from current
        if (paymentRequestData.merchant_id && paymentRequestData.merchant_id !== selectedMerchant) {
          console.log('Updating selected merchant to:', paymentRequestData.merchant_id);
          setSelectedMerchant(paymentRequestData.merchant_id);
          const merchant = getMerchantById(paymentRequestData.merchant_id);
          if (merchant) {
            setMerchantSlug(merchant.id);
          }
        }
        
        // Reset to using last payment endpoint when we get new data
        setUseStatusEndpoint(false);
      } else {
        throw new Error('No payment request found for this merchant');
      }
    } catch (error) {
      console.error('Error fetching last payment:', error);
      if (showLoading) {
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch payment request'
        );
        setPaymentRequest(null);
      }
    } finally {
      if (showLoading) {
        setIsLoadingPayment(false);
      }
    }
  };

  // Handle merchant selection
  const handleMerchantChange = async (merchantIdValue: string) => {
    setSelectedMerchant(merchantIdValue);
    // Reset payment state when changing merchants
    setPaymentRequest(null);
    setError(null);
    setUseStatusEndpoint(false);
    
    const merchant = getMerchantById(merchantIdValue);
    if (merchant) {
      setMerchantSlug(merchant.id);
      await fetchLastPayment(merchantIdValue);
    }
  };

  // Handle new order - reload the products iframe
  const handleNewOrder = () => {
    setIframeKey(prev => prev + 1);
    // Reset to using last payment endpoint for new orders
    setUseStatusEndpoint(false);
  };

  // Initial load - default to Swag Shop
  useEffect(() => {
    if (!isValidated) return;
    
    setSelectedMerchant('69138269ea5ff64e14b83b6f');
    fetchLastPayment('69138269ea5ff64e14b83b6f');
  }, [isValidated]);

  // Auto-refresh payment every 2 seconds
  useEffect(() => {
    if (!selectedMerchant || !isValidated) return;

    // Capture the current payment ID
    const currentPaymentId = paymentRequest?.id;

    const intervalId = setInterval(() => {
      // Always fetch last payment to detect new orders
      fetchLastPayment(selectedMerchant, false);
      
      // Also fetch payment status if we have a payment ID
      if (currentPaymentId) {
        fetchPaymentStatus(currentPaymentId, false);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [selectedMerchant, paymentRequest?.id, isValidated]);

  // Don't render until validated
  if (!isValidated) {
    return (
      <div className="min-h-screen w-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-white">
      {/* Three column layout: 20% / 40% / 40% */}
      <div className="grid gap-0 h-screen" style={{ gridTemplateColumns: '20% 40% 40%' }}>
        {/* Left Column - QR Code and Controls (20%) */}
        <div className="flex flex-col bg-[#a969fe] p-6 border-r border-gray-200">
          <h1 className="text-white text-3xl font-bold text-center mb-6">
            Merchant
          </h1>
          
          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-3 rounded-lg shadow-lg">
              <QRCodeSVG
                value={`https://pay.simplefi.tech/${merchantSlug}`}
                title="Merchant QR Code"
                size={180}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                imageSettings={{
                  src: 'https://www.pagar.simplefi.tech/icon.png',
                  x: undefined,
                  y: undefined,
                  height: 18,
                  width: 18,
                  opacity: 1,
                  excavate: true,
                }}
              />
            </div>
          </div>

          {/* Merchant Selector */}
          <div className="mb-4">
            <div className="relative">
              <select
                value={selectedMerchant}
                onChange={(e) => handleMerchantChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-4 py-3 text-base font-normal appearance-none cursor-pointer focus:outline-none focus:border-blue-500"
              >
                <option value="">Select merchant</option>
                {Object.entries(MERCHANTS).map(([id, merchant]) => {
                  if (
                    merchant.id !== 'cafe-cuyo' ||
                    (internalDebuging(paraEmail) && merchant.id === 'cafe-cuyo')
                  ) {
                    return (
                      <option key={id} value={id} className="text-gray-800">
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
          </div>

          {/* New Order Button */}
          <Button
            onClick={handleNewOrder}
            className="w-full text-white px-6 py-3 rounded-md font-bold cursor-pointer mb-4"
            style={{ backgroundColor: '#6534ff' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5429cc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6534ff'}
          >
            New Order
          </Button>
        </div>

        {/* Middle Column - Products iframe (40%) */}
        <div className="flex flex-col border-r border-gray-200">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-gray-800 text-xl font-semibold">Products</h2>
            <p className="text-gray-600 text-sm mt-1">
              Browse and select items from {getMerchantById(selectedMerchant)?.name || 'merchant'}
            </p>
          </div>
          <div className="flex-1 relative bg-white">
            <iframe
              key={iframeKey}
              src={`https://pay.simplefi.tech/${merchantSlug}/products`}
              className="absolute inset-0 w-full h-full"
              title="Merchant Products"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>

        {/* Right Column - Payment Info (40%) */}
        <div className={`flex flex-col p-6 overflow-y-auto ${
          paymentRequest && (paymentRequest.status === 'approved' || paymentRequest.status_detail === 'correct')
            ? 'bg-[#22c55e]'
            : 'bg-gray-100'
        }`}>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold mb-6 ${
              paymentRequest && (paymentRequest.status === 'approved' || paymentRequest.status_detail === 'correct')
                ? 'text-white'
                : 'text-gray-800'
            }`}>Payment Information</h2>
            
            {isLoadingPayment ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mb-4 ${
                  paymentRequest && (paymentRequest.status === 'approved' || paymentRequest.status_detail === 'correct')
                    ? 'border-white'
                    : 'border-gray-800'
                }`}></div>
                <p className={
                  paymentRequest && (paymentRequest.status === 'approved' || paymentRequest.status_detail === 'correct')
                    ? 'text-white'
                    : 'text-gray-800'
                }>Loading payment...</p>
              </div>
            ) : error ? (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            ) : paymentRequest ? (
              (() => {
                const isConfirmed = paymentRequest.status === 'approved' || paymentRequest.status_detail === 'correct';
                const cardStyle = isConfirmed
                  ? { background: '#05180e70', border: '2px solid #ffffff63', borderRadius: '26px', padding: '22px 20px' }
                  : undefined;
                const cardClass = isConfirmed
                  ? '' // Use inline styles for confirmed
                  : 'border-2 border-gray-300 rounded-xl p-5 bg-white shadow-sm';
                const labelClass = isConfirmed ? 'text-white/90 font-medium' : 'text-gray-600 font-medium';
                const valueClass = isConfirmed ? 'text-white font-bold' : 'text-gray-900 font-bold';
                const borderClass = isConfirmed ? 'border-white/30' : 'border-gray-200';
                
                return (
              <div className="space-y-4">
                {/* Order Details */}
                <div className={cardClass} style={cardStyle}>
                  <div className={`flex justify-between items-center mb-3 pb-3 border-b ${borderClass}`}>
                    <span className={labelClass}>Order ID:</span>
                    <span className={`${valueClass} text-lg`}>
                      {paymentRequest.order_id}
                    </span>
                  </div>
                  
                  <div className={`flex justify-between items-start mb-3 pb-3 border-b ${borderClass}`}>
                    <span className={labelClass}>Payment ID:</span>
                    <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-mono text-xs break-all text-right max-w-[70%]`}>
                      {paymentRequest.id}
                    </span>
                  </div>
                  
                  {paymentRequest.amount && (
                    <div className={`flex justify-between items-center mb-3 pb-3 border-b ${borderClass}`}>
                      <span className={labelClass}>Amount:</span>
                      <span className={`${valueClass} text-xl`}>
                        {paymentRequest.amount} {paymentRequest.currency}
                      </span>
                    </div>
                  )}

                  {/* USD Amount */}
                  {paymentRequest.usd_amount && (
                    <div className="flex justify-between items-center">
                      <span className={labelClass}>USD Price:</span>
                      <span className={`${valueClass} text-lg`}>
                        ${paymentRequest.usd_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Products/Items */}
                {paymentRequest.items && paymentRequest.items.length > 0 && (
                  <div className={cardClass} style={cardStyle}>
                    <h3 className={`${valueClass} mb-3`}>Order Items</h3>
                    <div className="space-y-2">
                      {paymentRequest.items.map((item, index) => (
                        <div key={item.id || index} className="flex justify-between items-center text-sm">
                          <span className={labelClass}>
                            {item.quantity}x {item.name}
                          </span>
                          <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-semibold`}>
                            {item.price} {item.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transaction Details - Show the paid transaction or first available */}
                {(() => {
                  // First check if there's a payment at the root level
                  const rootPayment = paymentRequest.payments?.[0];
                  
                  // Then check transactions
                  const paidTransaction = paymentRequest.transactions?.find(
                    (tx) => tx.payments && tx.payments.length > 0
                  );
                  
                  // Find Base USDC transaction (chain_id 8453 and coin USDC)
                  const baseUsdcTransaction = paymentRequest.transactions?.find(
                    (tx) => tx.chain_id === 8453 && tx.coin === 'USDC'
                  );
                  
                  const displayTransaction = paidTransaction || paymentRequest.transactions?.[0];
                  
                  if (!displayTransaction && !rootPayment) return null;
                  
                  // Get payment details from root payment or transaction payment
                  const txHash = rootPayment?.hash || paidTransaction?.payments?.[0]?.hash;
                  const payerAddress = rootPayment?.from || paidTransaction?.payments?.[0]?.from;
                  const paymentChainId = rootPayment?.chain_id || displayTransaction?.chain_id;
                  const paymentCoin = rootPayment?.coin || displayTransaction?.coin;
                  
                  return (
                    <div className={cardClass} style={cardStyle}>
                      <h3 className={`${valueClass} mb-4 text-xl`}>Payment Details</h3>
                      <div className="space-y-3 text-base">
                        {/* Show Base USDC address if not confirmed */}
                        {!isConfirmed && baseUsdcTransaction && (
                          <>
                            <div className="flex justify-between">
                              <span className={labelClass}>Network:</span>
                              <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>
                                Base
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={labelClass}>Token:</span>
                              <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>
                                USDC
                              </span>
                            </div>
                            <div className="flex justify-between items-start gap-2">
                              <span className={labelClass}>Address:</span>
                              <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-mono text-sm break-all text-right flex-1`}>
                                {baseUsdcTransaction.address}
                              </span>
                            </div>
                            {baseUsdcTransaction.price_details?.final_amount && (
                              <div className="flex justify-between items-start pt-2 border-t border-gray-200">
                                <span className={labelClass}>Amount:</span>
                                <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>
                                  {baseUsdcTransaction.price_details.final_amount} USDC
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Show transaction details if confirmed */}
                        {isConfirmed && (
                          <>
                            {paymentChainId && (
                              <div className="flex justify-between">
                                <span className={labelClass}>Network:</span>
                                <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>
                                  {getNetworkName(paymentChainId)}
                                </span>
                              </div>
                            )}
                            {paymentCoin && (
                              <div className="flex justify-between">
                                <span className={labelClass}>Token:</span>
                                <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>
                                  {paymentCoin}
                                </span>
                              </div>
                            )}
                            {displayTransaction && (
                              <div className="flex justify-between items-start gap-2">
                                <span className={labelClass}>Recipient:</span>
                                <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-mono text-sm break-all text-right flex-1`}>
                                  {displayTransaction.address}
                                </span>
                              </div>
                            )}
                            {payerAddress && (
                              <div className={`flex justify-between items-start gap-2 pt-2 border-t ${borderClass}`}>
                                <span className={labelClass}>Payer Address:</span>
                                <span className={`${isConfirmed ? 'text-white' : 'text-gray-900'} font-mono text-sm break-all text-right flex-1`}>
                                  {payerAddress}
                                </span>
                              </div>
                            )}
                            {txHash && paymentChainId && (
                              <div className={`flex justify-between items-start gap-2 pt-2 border-t ${borderClass}`}>
                                <span className={labelClass}>TX Hash:</span>
                                <a
                                  href={getExplorerUrl(paymentChainId, txHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${isConfirmed ? 'text-white' : 'text-blue-600'} font-mono text-sm break-all text-right flex-1 hover:underline`}
                                >
                                  {txHash}
                                </a>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Status */}
                {paymentRequest.status && (
                  <div className={cardClass} style={cardStyle}>
                    <div className="flex justify-between items-center">
                      <span className={`${labelClass} text-lg`}>Status:</span>
                      <span className={`${valueClass} uppercase text-xl`}>
                        {paymentRequest.status}
                      </span>
                    </div>
                  </div>
                )}

                {/* Refresh Payment Button */}
                <div className="mt-6">
                  <Button
                    onClick={() => selectedMerchant && fetchLastPayment(selectedMerchant)}
                    disabled={isLoadingPayment || !selectedMerchant}
                    className="w-full text-white px-6 py-4 rounded-md font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: isLoadingPayment || !selectedMerchant ? undefined : '#6534ff' }}
                    onMouseEnter={(e) => !isLoadingPayment && selectedMerchant && (e.currentTarget.style.backgroundColor = '#5429cc')}
                    onMouseLeave={(e) => !isLoadingPayment && selectedMerchant && (e.currentTarget.style.backgroundColor = '#6534ff')}
                  >
                    {isLoadingPayment ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="ml-2">Loading...</span>
                      </div>
                    ) : (
                      'Refresh Payment'
                    )}
                  </Button>
                </div>
              </div>
                );
              })()
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p>Select a merchant and click Refresh to load payment information</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

