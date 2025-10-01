'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTokenInfo } from '@/config/tokens';
import { getNetworkConfig } from '@/config/networks';

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
}: StatusStepProps) {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    currentStepIndex: 0,
    overallStatus: 'processing',
  });

  // Sync internal state with received txStatus
  useEffect(() => {
    const newState = mapTxStatusToTransactionState(txStatus, txError, isPara);
    setTransactionState(newState);
  }, [txStatus, txError, isPara]);

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

  if (txStatus === 'confirmed') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Payment Successful!</h2>
          <p className="text-sm text-gray-600">
            Your USDC transfer has been completed successfully.
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

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700">
            <div className="font-medium">Transaction Details:</div>
            <div className="mt-2 space-y-1">
              <div>
                Amount: {amount} {token}
              </div>
              <div>Network: {getNetworkConfig(chainId)?.name || 'Unknown'}</div>
              <div>
                From:{' '}
                {connectedAddress
                  ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
                  : 'Unknown'}
              </div>
              <div>Status: {isSimulation ? 'Simulation' : 'Confirmed'}</div>
              {txHash && !isSimulation && (
                <div className="pt-2">
                  <a
                    href={getTransactionExplorerUrl(txHash, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                  >
                    View Transaction
                  </a>
                </div>
              )}
              {isPara && isSimulation && (
                <div className="pt-2 text-orange-600 text-xs">
                  ⚠️ This is a simulation - no actual transaction was sent
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={onDone}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Done
        </Button>
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
              <div className="mt-2">
                {transactionState.errorMessage || 'Unknown error occurred'}
              </div>
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
