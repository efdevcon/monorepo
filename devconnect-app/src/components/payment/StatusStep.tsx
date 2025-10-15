'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTokenInfo } from '@/config/tokens';
import { getNetworkConfig } from '@/config/networks';
import { useLocalStorage } from 'usehooks-ts';
import { useClearEIP7702 } from '@/hooks/useClearEIP7702';

// Helper function to get the correct explorer URL for a transaction
const getTransactionExplorerUrl = (txHash: string, chainId: number): string => {
  switch (chainId) {
    case 1: // Ethereum
      return `https://etherscan.io/tx/${txHash}`;
    case 8453: // Base
      return `https://basescan.org/tx/${txHash}`;
    case 10: // Optimism
      return `https://optimistic.etherscan.io/tx/${txHash}`;
    case 137: // Polygon
      return `https://polygonscan.com/tx/${txHash}`;
    case 42161: // Arbitrum
      return `https://arbiscan.io/tx/${txHash}`;
    default:
      return `https://basescan.org/tx/${txHash}`; // Default to Base
  }
};
import {
  Settings,
  Pen,
  Radio,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

type TransactionStatusBadge =
  | 'completed'
  | 'in-progress'
  | 'pending'
  | 'failed';

type TransactionStep = {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: TransactionStatusBadge;
};

type TransactionState = {
  currentStepIndex: number;
  overallStatus: 'processing' | 'completed' | 'failed';
  failedStepIndex?: number;
  transactionHash?: string;
  errorMessage?: string;
};

type StoredPaymentInfo = {
  paymentId: string;
  amount: string;
  token: string;
  chainId: number;
  txHash: string | null;
  timestamp: number;
  orderId?: string;
  recipient?: string;
  connectedAddress?: string;
};

type StoredPayments = {
  [paymentId: string]: StoredPaymentInfo;
};

interface StatusStepProps {
  txStatus: string;
  txError: string;
  isPara: boolean;
  amount: string;
  token?: string;
  chainId?: number;
  connectedAddress?: string;
  txHash?: string | null;
  isSimulation?: boolean;
  simulationDetails?: {
    estimatedGas: string;
    estimatedCost: string;
    gasPrice: string;
    success: boolean;
    message: string;
  } | null;
  onDone: () => void;
  onTryAgain?: () => void;
  paymentId?: string;
  orderId?: string;
  isAlreadyCompleted?: boolean;
}

const getParaSteps = (isPara: boolean) => {
  if (isPara) {
    return [
      {
        id: 'preparing',
        label: 'Preparing Authorization',
        icon: <Settings className="w-4 h-4" />,
      },
      {
        id: 'signing',
        label: 'Signing Authorization',
        icon: <Pen className="w-4 h-4" />,
      },
      {
        id: 'executing',
        label: 'Executing Transfer',
        icon: <Radio className="w-4 h-4" />,
      },
      {
        id: 'confirming',
        label: 'Confirming',
        icon: <Clock className="w-4 h-4" />,
      },
      {
        id: 'confirmed',
        label: 'Confirmed',
        icon: <CheckCircle className="w-4 h-4" />,
      },
    ];
  } else {
    return [
      {
        id: 'transfer',
        label: 'Transfer',
        icon: <Radio className="w-4 h-4" />,
      },
      {
        id: 'confirmed',
        label: 'Confirmed',
        icon: <CheckCircle className="w-4 h-4" />,
      },
    ];
  }
};

const getStatusBadge = (status: TransactionStatusBadge) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-[#3ea331] hover:bg-[#3ea331] text-white text-xs px-2 py-1 rounded-full">
          Completed
        </Badge>
      );
    case 'in-progress':
      return (
        <Badge className="bg-[#f01888] hover:bg-[#f01888] text-white text-xs px-2 py-1 rounded-full">
          In Progress
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-[#dc2626] hover:bg-[#dc2626] text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case 'pending':
      return null;
  }
};

const getStepLineColor = (status: TransactionStatusBadge, isLast: boolean) => {
  if (isLast) return 'transparent';

  switch (status) {
    case 'completed':
      return '#3ea331';
    case 'in-progress':
      return '#f01888';
    case 'failed':
      return '#dc2626';
    case 'pending':
      return '#363636';
  }
};

const getStepIconColor = (status: TransactionStatusBadge) => {
  switch (status) {
    case 'completed':
      return 'text-[#3ea331]';
    case 'in-progress':
      return 'text-[#f01888]';
    case 'failed':
      return 'text-[#dc2626]';
    case 'pending':
      return 'text-[#a28495]';
  }
};

const getStepIcon = (step: any, status: TransactionStatusBadge) => {
  if (status === 'in-progress') {
    return <Loader2 className="w-4 h-4 animate-spin text-[#f01888]" />;
  }
  return step.icon;
};

const mapTxStatusToTransactionState = (
  txStatus: string,
  txError: string,
  isPara: boolean
): TransactionState => {
  if (isPara) {
    const stepIndexMap: Record<string, number> = {
      preparing: 0,
      signing: 1,
      executing: 2,
      confirming: 3,
      confirmed: 4,
    };

    switch (txStatus) {
      case 'idle':
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
      case 'preparing':
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
      case 'signing':
        return {
          currentStepIndex: 1,
          overallStatus: 'processing',
        };
      case 'executing':
        return {
          currentStepIndex: 2,
          overallStatus: 'processing',
        };
      case 'confirming':
        return {
          currentStepIndex: 3,
          overallStatus: 'processing',
        };
      case 'confirmed':
        return {
          currentStepIndex: 4,
          overallStatus: 'completed',
        };
      case 'error':
        // Determine which step failed based on error message
        let failedStepIndex = 0;
        if (txError.toLowerCase().includes('sign')) {
          failedStepIndex = 1;
        } else if (txError.toLowerCase().includes('execute')) {
          failedStepIndex = 2;
        } else if (txError.toLowerCase().includes('confirm')) {
          failedStepIndex = 3;
        }

        return {
          currentStepIndex: failedStepIndex,
          overallStatus: 'failed',
          failedStepIndex,
          errorMessage: txError,
        };
      default:
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
    }
  } else {
    // Simplified flow for regular transactions
    switch (txStatus) {
      case 'idle':
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
      case 'pending':
      case 'preparing':
      case 'signing':
      case 'broadcasting':
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
      case 'confirming':
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
      case 'confirmed':
        return {
          currentStepIndex: 1,
          overallStatus: 'completed',
        };
      case 'error':
        return {
          currentStepIndex: 0,
          overallStatus: 'failed',
          failedStepIndex: 0,
          errorMessage: txError,
        };
      default:
        return {
          currentStepIndex: 0,
          overallStatus: 'processing',
        };
    }
  }
};

export default function StatusStep({
  txStatus,
  txError,
  isPara,
  amount,
  token = 'USDC',
  chainId = 8453,
  connectedAddress,
  txHash,
  isSimulation,
  simulationDetails,
  onDone,
  onTryAgain,
  paymentId,
  orderId,
  isAlreadyCompleted = false,
}: StatusStepProps) {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    currentStepIndex: 0,
    overallStatus: 'processing',
  });

  // Local storage for completed payments
  const [storedPayments, setStoredPayments] = useLocalStorage<StoredPayments>(
    'devconnect-payments',
    {}
  );

  // EIP-7702 delegation clearing hook
  const {
    clearDelegation,
    isClearing: isDelegationClearing,
    isSuccess: isDelegationSuccess,
    isError: isDelegationError,
    error: delegationError,
    txHash: delegationTxHash,
  } = useClearEIP7702();

  // Sync internal state with received txStatus
  useEffect(() => {
    const newState = mapTxStatusToTransactionState(txStatus, txError, isPara);
    setTransactionState(newState);
  }, [txStatus, txError, isPara]);

  // Save payment info to local storage ONLY when first confirmed (never on reload)
  useEffect(() => {
    // Don't save if this is an already completed payment being viewed
    if (isAlreadyCompleted) {
      console.log(
        'ℹ️ [PAYMENT_STORAGE] Skipping save for already completed payment:',
        paymentId
      );
      return;
    }

    if (txStatus === 'confirmed' && paymentId && !isSimulation && txHash) {
      setStoredPayments((prev) => {
        // If payment already exists, don't overwrite anything
        if (prev[paymentId]) {
          console.log(
            'ℹ️ [PAYMENT_STORAGE] Payment already exists, skipping save:',
            paymentId
          );
          return prev;
        }

        // This is a NEW payment confirmation - save it
        const paymentInfo: StoredPaymentInfo = {
          paymentId,
          amount,
          token,
          chainId,
          txHash,
          timestamp: Date.now(), // Set timestamp only on first confirmation
          orderId,
          recipient: 'Devconnect',
          connectedAddress,
        };

        console.log('💾 [PAYMENT_STORAGE] Saving NEW payment:', paymentInfo);

        return {
          ...prev,
          [paymentId]: paymentInfo,
        };
      });
    }
  }, [
    txStatus,
    paymentId,
    amount,
    token,
    chainId,
    txHash,
    orderId,
    connectedAddress,
    isSimulation,
    isAlreadyCompleted,
    setStoredPayments,
  ]);

  const initialSteps = getParaSteps(isPara);

  const generateSteps = (): TransactionStep[] => {
    return initialSteps.map((step, index) => {
      let status: TransactionStatusBadge = 'pending';

      if (
        transactionState.overallStatus === 'failed' &&
        transactionState.failedStepIndex === index
      ) {
        status = 'failed';
      } else if (index < transactionState.currentStepIndex) {
        status = 'completed';
      } else if (
        index === transactionState.currentStepIndex &&
        transactionState.overallStatus === 'processing'
      ) {
        status = 'in-progress';
      } else if (transactionState.overallStatus === 'completed') {
        status = 'completed';
      }

      return { ...step, status };
    });
  };

  const steps = generateSteps();

  // Get stored payment info if available
  const storedPaymentInfo =
    paymentId && storedPayments[paymentId] ? storedPayments[paymentId] : null;

  // Handle both confirmed and already completed cases
  if (txStatus === 'confirmed' || isAlreadyCompleted) {
    // Use stored info if this is an already completed payment and we don't have current data
    const displayAmount = amount || storedPaymentInfo?.amount || '0';
    const displayToken = token || storedPaymentInfo?.token || 'USDC';
    const displayChainId = chainId || storedPaymentInfo?.chainId || 8453;
    const displayTxHash = txHash || storedPaymentInfo?.txHash || null;
    const displayOrderId = orderId || storedPaymentInfo?.orderId || null;
    const displayTimestamp = storedPaymentInfo?.timestamp
      ? new Date(storedPaymentInfo.timestamp)
      : new Date();

    return (
      <div className="flex flex-col items-center gap-8 py-6">
        {/* Wallet Icon with Check Mark */}
        <div className="relative">
          <img
            src="/images/wallet-loaded.gif"
            alt="Wallet loaded with checkmark"
            className="w-[280px] h-[280px] object-contain"
          />
        </div>

        {/* Payment Details */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col gap-3">
            <p
              className="text-[20px] leading-none text-[#353548]"
              style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}
            >
              You paid
            </p>
            <p
              className="text-[24px] leading-none text-[#353548]"
              style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}
            >
              <span className="font-bold text-[#20202B]">
                {displayAmount} {displayToken}
              </span>
              {' to '}
              <span className="font-bold text-[#20202B]">Devconnect</span>
            </p>
          </div>

          <div
            className="text-[16px] leading-[1.3] text-[#353548]"
            style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}
          >
            <p className="font-bold mb-0" style={{ fontWeight: 700 }}>
              {displayOrderId
                ? `Order ID: ${displayOrderId}`
                : 'Transaction Complete'}
            </p>
            <p>
              {displayTimestamp.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full max-w-[345px]">
          {displayTxHash && !isSimulation && (
            <a
              href={getTransactionExplorerUrl(displayTxHash, displayChainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#EAF3FA] hover:bg-[#D5E7F4] transition-colors flex items-center justify-center gap-2 px-6 py-3 rounded-[1px] text-[#44445D] font-bold text-[16px] no-underline"
              style={{
                fontFamily: 'Roboto, sans-serif',
                boxShadow: '0px 4px 0px 0px #595978',
              }}
            >
              {displayChainId === 8453 ? 'BaseScan' : 'Explorer'}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M12 3.5L12 9.5L10.5 9.5L10.5 5.5L5 11L4 10L9.5 4.5L5.5 4.5L5.5 3L11.5 3C11.7761 3 12 3.22386 12 3.5Z" />
              </svg>
            </a>
          )}
          <button
            onClick={onDone}
            className="flex-1 bg-[#0073DE] hover:bg-[#005DAC] transition-colors flex items-center justify-center px-6 py-3 rounded-[1px] text-white font-bold text-[16px] border-none cursor-pointer"
            style={{
              fontFamily: 'Roboto, sans-serif',
              boxShadow: '0px 4px 0px 0px #005493',
            }}
          >
            Return to App
          </button>
        </div>

        {isPara && isSimulation && (
          <div className="mt-2 inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Simulation Mode
          </div>
        )}
      </div>
    );
  }

  if (isPara && isSimulation && simulationDetails) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Simulation Successful!</h2>
          <p className="text-sm text-gray-600">
            Transaction simulation completed successfully.
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-700">
            <div className="font-medium">Simulation Details:</div>
            <div className="mt-2 space-y-1">
              <div>Amount: {amount} USDC</div>
              <div>Network: Base</div>
              <div>
                From:{' '}
                {connectedAddress
                  ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
                  : 'Unknown'}
              </div>
              <div>Estimated Gas: {simulationDetails.estimatedGas}</div>
              <div>Estimated Cost: {simulationDetails.estimatedCost} ETH</div>
              <div>Gas Price: {simulationDetails.gasPrice}</div>
              <div>Status: Simulation</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700">
            <div className="font-medium">Note:</div>
            <div className="mt-1">
              This is a simulation. To execute the actual transaction, configure
              the PRIVATE_KEY environment variable.
            </div>
          </div>
        </div>

        <Button
          onClick={onDone}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          Done
        </Button>
      </div>
    );
  }

  if (txStatus === 'error') {
    const isUserCancellation =
      txError.includes('cancelled by user') ||
      txError.includes('User denied') ||
      txError.includes('User rejected');

    const isEIP7702DelegationError =
      txError.includes('EIP-7702') ||
      txError.includes('clear-delegation') ||
      txError.includes('delegation active');

    return (
      <div className="space-y-6">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isUserCancellation ? 'Payment Cancelled' : 'Payment Failed'}
          </h2>
          <p className="text-sm text-gray-600">
            {isUserCancellation
              ? 'You cancelled the transaction in your wallet.'
              : 'There was an error processing your payment.'}
          </p>
          {isPara && isSimulation && (
            <div className="mt-2 inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Simulation Mode
            </div>
          )}
        </div>

        {!isUserCancellation && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">
              <div className="font-medium">Error Details:</div>
              <div className="mt-2 whitespace-pre-wrap">
                {transactionState.errorMessage || 'Unknown error occurred'}
              </div>
            </div>
          </div>
        )}

        {isEIP7702DelegationError && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4">
            <div className="text-sm">
              <div className="font-semibold mb-2 flex items-center gap-2 text-emerald-900">
                <CheckCircle className="h-5 w-5" />
                Quick Fix Available
              </div>
              <p className="mb-3 text-emerald-800">
                Your wallet has EIP-7702 delegation active. This prevents
                standard USDC transfers from working.
              </p>

              {!isDelegationSuccess && !isDelegationClearing && (
                <>
                  <div className="bg-white border border-emerald-300 rounded p-3 mb-3">
                    <div className="font-semibold text-emerald-900 mb-1">
                      ✅ One-Click Solution:
                    </div>
                    <p className="text-emerald-700 text-xs">
                      Click the button below to clear the delegation. You'll
                      sign with your wallet, our backend relayer pays for gas.
                      <strong className="text-emerald-600">
                        {' '}
                        NO ETH needed!
                      </strong>
                    </p>
                  </div>
                  <Button
                    onClick={clearDelegation}
                    disabled={isDelegationClearing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {isDelegationClearing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Clearing Delegation...
                      </span>
                    ) : (
                      '✅ Clear Delegation Now (Free)'
                    )}
                  </Button>
                </>
              )}

              {isDelegationClearing && (
                <div className="bg-blue-50 border border-blue-300 rounded p-3 text-blue-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-semibold">
                      Clearing delegation...
                    </span>
                  </div>
                  <p className="text-xs mt-1">
                    Please wait while we process your request.
                  </p>
                </div>
              )}

              {isDelegationSuccess && (
                <div className="bg-emerald-100 border border-emerald-400 rounded p-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                    <CheckCircle className="h-5 w-5" />
                    Delegation Cleared Successfully!
                  </div>
                  <p className="text-xs text-emerald-700 mt-2">
                    Your wallet is now back to normal mode. You can try your
                    payment again.
                  </p>
                  {delegationTxHash && (
                    <a
                      href={`https://basescan.org/tx/${delegationTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:text-emerald-700 underline mt-1 block"
                    >
                      View transaction →
                    </a>
                  )}
                </div>
              )}

              {isDelegationError && (
                <div className="bg-red-50 border border-red-300 rounded p-3 text-red-800">
                  <div className="font-semibold">
                    Failed to clear delegation
                  </div>
                  <p className="text-xs mt-1">{delegationError}</p>
                  <Button
                    onClick={clearDelegation}
                    className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={isUserCancellation && onTryAgain ? onTryAgain : onDone}
          className={`w-full ${isUserCancellation ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          {isUserCancellation ? 'Try Again' : 'Close'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Loading Animation */}
      <div className="flex justify-center">
        <img
          src="/images/wallet-loading.gif"
          alt="Processing payment"
          className="w-[280px] h-[280px] object-contain"
        />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
        <p className="text-sm text-gray-600">
          {isPara
            ? 'Processing your authorization and transfer...'
            : 'Processing your transaction...'}
        </p>
        {isPara && isSimulation && (
          <div className="mt-2 inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Simulation Mode
          </div>
        )}
      </div>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const lineColor = getStepLineColor(step.status, isLast);
          const iconColor = getStepIconColor(step.status);

          return (
            <div key={step.id} className="relative">
              <div className="flex items-center gap-4 py-4">
                <div className={`flex-shrink-0 ${iconColor}`}>
                  {getStepIcon(initialSteps[index], step.status)}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-medium">{step.label}</span>
                  {getStatusBadge(step.status)}
                </div>
              </div>

              {!isLast && (
                <div
                  className="absolute left-2 top-12 w-px h-4"
                  style={{ backgroundColor: lineColor }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
