'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
const SuspenseHOC = (Component: React.ComponentType) => {
  return (props: any) => (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Component {...props} />
    </React.Suspense>
  );
};

export default SuspenseHOC(function OnrampPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'pending'
  >('loading');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  const type = searchParams.get('type');
  const confirm = searchParams.get('confirm');
  const transactionId = searchParams.get('transactionId');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    // Handle MoonPay redirect
    if (type === 'moonpay' && confirm === 'true') {
      handleMoonPayRedirect();
    }
    // Handle Transak redirect
    if (type === 'transak' && confirm === 'true') {
      handleTransakRedirect();
    }
    // Handle Coinbase redirect
    if (type === 'coinbase' && confirm === 'true') {
      handleCoinbaseRedirect();
    }
  }, [type, confirm]);

  const handleMoonPayRedirect = () => {
    // Check for MoonPay specific parameters
    const moonPayStatus = searchParams.get('transactionStatus');
    const moonPayTransactionId = searchParams.get('transactionId');
    const moonPayError = searchParams.get('error');
    const moonPayCurrencyCode = searchParams.get('currencyCode');
    const moonPayBaseCurrencyAmount = searchParams.get('baseCurrencyAmount');
    const moonPayWalletAddress = searchParams.get('walletAddress');

    if (moonPayError) {
      setStatus('error');
      setTransactionDetails({ error: moonPayError });
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ MoonPay Transaction Failed
          </div>
          <div className="text-sm text-red-700">Error: {moonPayError}</div>
        </div>,
        {
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      return;
    }

    if (moonPayStatus === 'completed' || moonPayTransactionId) {
      setStatus('success');
      setTransactionDetails({
        transactionId: moonPayTransactionId,
        status: moonPayStatus,
        provider: 'MoonPay',
        currencyCode: moonPayCurrencyCode,
        baseCurrencyAmount: moonPayBaseCurrencyAmount,
        walletAddress: moonPayWalletAddress,
      });
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">
            ✅ MoonPay Transaction Successful!
          </div>
          <div className="text-sm text-green-700">
            Your funds have been added to your wallet successfully.
          </div>
        </div>,
        {
          duration: 5000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } else {
      setStatus('pending');
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            ⏳ Transaction Processing
          </div>
          <div className="text-sm text-blue-700">
            Your MoonPay transaction is being processed. Please wait...
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    }
  };

  const handleTransakRedirect = () => {
    // Check for Transak specific parameters
    const transakOrderId = searchParams.get('orderId');
    const transakStatus = searchParams.get('status');
    const transakFiatCurrency = searchParams.get('fiatCurrency');
    const transakCryptoCurrency = searchParams.get('cryptoCurrency');
    const transakFiatAmount = searchParams.get('fiatAmount');
    const transakCryptoAmount = searchParams.get('cryptoAmount');
    const transakWalletAddress = searchParams.get('walletAddress');
    const transakNetwork = searchParams.get('network');
    const transakTotalFee = searchParams.get('totalFeeInFiat');
    const transakIsBuyOrSell = searchParams.get('isBuyOrSell');
    const transakIsNFTOrder = searchParams.get('isNFTOrder');
    const transakError = searchParams.get('error');

    if (transakError) {
      setStatus('error');
      setTransactionDetails({ error: transakError });
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ Transak Transaction Failed
          </div>
          <div className="text-sm text-red-700">Error: {transakError}</div>
        </div>,
        {
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      return;
    }

    if (transakStatus === 'COMPLETED') {
      setStatus('success');
      setTransactionDetails({
        orderId: transakOrderId,
        status: transakStatus,
        provider: 'Transak',
        fiatCurrency: transakFiatCurrency,
        cryptoCurrency: transakCryptoCurrency,
        fiatAmount: transakFiatAmount,
        cryptoAmount: transakCryptoAmount,
        walletAddress: transakWalletAddress,
        network: transakNetwork,
        totalFee: transakTotalFee,
        transactionType: transakIsBuyOrSell,
        isNFTOrder: transakIsNFTOrder,
      });
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">
            ✅ Transak Transaction Successful!
          </div>
          <div className="text-sm text-green-700">
            Your funds have been added to your wallet successfully.
          </div>
        </div>,
        {
          duration: 5000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } else if (transakStatus === 'PROCESSING' || transakOrderId) {
      setStatus('pending');
      setTransactionDetails({
        orderId: transakOrderId,
        status: transakStatus,
        provider: 'Transak',
        fiatCurrency: transakFiatCurrency,
        cryptoCurrency: transakCryptoCurrency,
        fiatAmount: transakFiatAmount,
        cryptoAmount: transakCryptoAmount,
        walletAddress: transakWalletAddress,
        network: transakNetwork,
        totalFee: transakTotalFee,
        transactionType: transakIsBuyOrSell,
        isNFTOrder: transakIsNFTOrder,
      });
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            ⏳ Transaction Processing
          </div>
          <div className="text-sm text-blue-700">
            Your Transak transaction is being processed. This may take a few
            minutes to complete.
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } else {
      setStatus('pending');
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            ⏳ Transaction Processing
          </div>
          <div className="text-sm text-blue-700">
            Your Transak transaction is being processed. Please wait...
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    }
  };

  const handleCoinbaseRedirect = () => {
    // Check for Coinbase specific parameters
    const coinbaseStatus = searchParams.get('status');
    const coinbaseTransactionId = searchParams.get('transactionId');
    const coinbaseError = searchParams.get('error');
    const coinbaseCurrencyCode = searchParams.get('currencyCode');
    const coinbaseAmount = searchParams.get('amount');
    const coinbaseWalletAddress = searchParams.get('walletAddress');
    const coinbaseNetwork = searchParams.get('network');

    if (coinbaseError) {
      setStatus('error');
      setTransactionDetails({ error: coinbaseError });
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ Coinbase Transaction Failed
          </div>
          <div className="text-sm text-red-700">Error: {coinbaseError}</div>
        </div>,
        {
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      return;
    }

    if (coinbaseStatus === 'completed' || coinbaseTransactionId) {
      setStatus('success');
      setTransactionDetails({
        transactionId: coinbaseTransactionId,
        status: coinbaseStatus,
        provider: 'Coinbase',
        currencyCode: coinbaseCurrencyCode,
        amount: coinbaseAmount,
        walletAddress: coinbaseWalletAddress,
        network: coinbaseNetwork,
      });
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">
            ✅ Coinbase Transaction Successful!
          </div>
          <div className="text-sm text-green-700">
            Your funds have been added to your wallet successfully.
          </div>
        </div>,
        {
          duration: 5000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } else {
      setStatus('pending');
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            ⏳ Transaction Processing
          </div>
          <div className="text-sm text-blue-700">
            Your Coinbase transaction is being processed. Please wait...
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: '⏳',
          title: 'Processing Transaction',
          description:
            'Please wait while we process your onramp transaction...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'success':
        return {
          icon: '✅',
          title: 'Transaction Successful!',
          description:
            'Your funds have been successfully added to your wallet.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'error':
        return {
          icon: '❌',
          title: 'Transaction Failed',
          description:
            'There was an issue with your transaction. Please try again.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case 'pending':
        return {
          icon: '⏳',
          title: 'Transaction Pending',
          description:
            'Your transaction is being processed. This may take a few minutes.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          description: 'Unable to determine transaction status.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div
          className={`${statusContent.bgColor} ${statusContent.borderColor} border-2 rounded-lg p-6 shadow-lg`}
        >
          <div className="text-center space-y-4">
            <div className="text-4xl">{statusContent.icon}</div>
            <h1 className={`text-2xl font-bold ${statusContent.color}`}>
              {statusContent.title}
            </h1>
            <p className="text-gray-700">{statusContent.description}</p>

            {/* Transaction Details */}
            {transactionDetails && (
              <div className="mt-4 p-3 bg-white rounded border">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Transaction Details
                </h3>
                <div className="text-sm space-y-1">
                  {transactionDetails.provider && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-medium">
                        {transactionDetails.provider}
                      </span>
                    </div>
                  )}
                  {transactionDetails.currencyCode &&
                    transactionDetails.baseCurrencyAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">
                          {transactionDetails.baseCurrencyAmount}{' '}
                          {transactionDetails.currencyCode}
                        </span>
                      </div>
                    )}
                  {(transactionDetails.transactionId ||
                    transactionDetails.orderId) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {transactionDetails.provider === 'Transak'
                          ? 'Order ID:'
                          : 'Transaction ID:'}
                      </span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {(
                          transactionDetails.transactionId ||
                          transactionDetails.orderId
                        )?.slice(0, 8)}
                        ...
                      </span>
                    </div>
                  )}
                  {transactionDetails.status && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium capitalize">
                        {transactionDetails.status}
                      </span>
                    </div>
                  )}
                  {transactionDetails.fiatAmount &&
                    transactionDetails.fiatCurrency && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">
                          {transactionDetails.fiatAmount}{' '}
                          {transactionDetails.fiatCurrency}
                        </span>
                      </div>
                    )}
                  {transactionDetails.cryptoAmount &&
                    transactionDetails.cryptoCurrency && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Crypto:</span>
                        <span className="font-medium">
                          {transactionDetails.cryptoAmount}{' '}
                          {transactionDetails.cryptoCurrency}
                        </span>
                      </div>
                    )}
                  {transactionDetails.network && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network:</span>
                      <span className="font-medium capitalize">
                        {transactionDetails.network}
                      </span>
                    </div>
                  )}
                  {transactionDetails.totalFee && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Fee:</span>
                      <span className="font-medium">
                        {transactionDetails.totalFee}{' '}
                        {transactionDetails.fiatCurrency}
                      </span>
                    </div>
                  )}
                  {transactionDetails.transactionType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">
                        {transactionDetails.transactionType}
                      </span>
                    </div>
                  )}
                  {transactionDetails.error && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-red-700 text-xs">
                      Error: {transactionDetails.error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-6">
              <Link href="/" className="w-full">
                <Button className="w-full" variant="default">
                  🏠 Return to Home
                </Button>
              </Link>

              {status === 'error' && (
                <Link href="/" className="w-full">
                  <Button className="w-full" variant="outline">
                    🔄 Try Again
                  </Button>
                </Link>
              )}

              {status === 'success' && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    // Copy transaction ID/Order ID to clipboard if available
                    const idToCopy =
                      transactionDetails?.transactionId ||
                      transactionDetails?.orderId;
                    if (idToCopy) {
                      navigator.clipboard.writeText(idToCopy);
                      const label =
                        transactionDetails?.provider === 'Transak'
                          ? 'Order ID'
                          : 'Transaction ID';
                      toast.success(`${label} copied to clipboard!`);
                    }
                  }}
                >
                  📋 Copy{' '}
                  {transactionDetails?.provider === 'Transak'
                    ? 'Order ID'
                    : 'Transaction ID'}
                </Button>
              )}
            </div>

            {/* Additional Info */}
            <div className="mt-4 text-xs text-gray-500">
              <p>
                Need help? Contact support if you have any questions about your
                transaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
