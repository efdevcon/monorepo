'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalContent } from 'lib/components/modal';
import { Button } from '@/components/ui/button';
import { X, Wallet } from 'lucide-react';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { usePaymentTransaction } from '@/hooks/usePaymentTransaction';
import PaymentForm from '@/components/payment/PaymentForm';
import PreviewStep from '@/components/payment/PreviewStep';
import StatusStep from '@/components/payment/StatusStep';
import { AUTHORIZED_SPONSOR_ADDRESSES, PAYMENT_CONFIG } from '@/config/config';

type PaymentStep = 'form' | 'preview' | 'status';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPara?: boolean;
  initialRecipient?: string;
  initialAmount?: string;
  orderId?: string;
  orderStatus?: string;
  orderStatusDetail?: string;
}

export default function ManualPaymentModal({
  isOpen,
  onClose,
  isPara = false,
  initialRecipient = '',
  initialAmount = '0.01',
  orderId,
  orderStatus,
  orderStatusDetail,
}: ManualPaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('form');
  const [paymentData, setPaymentData] = useState<{
    recipient: string;
    amount: string;
    token?: string;
    chainId?: number;
  }>({
    recipient: initialRecipient,
    amount: initialAmount,
  });
  const [isSystemSimulationMode, setIsSystemSimulationMode] = useState<
    boolean | null
  >(null);

  const productUrl = `${PAYMENT_CONFIG.SIMPLEFI_BASE_URL}/${PAYMENT_CONFIG.MERCHANT_ID}/products/688ba8db51fc6c100f32cd63`;

  // Get wallet connection status
  const { isConnected, address: connectedAddress } = useUnifiedConnection();

  // Payment transaction hook
  const {
    sendTransaction,
    txStatus,
    txError,
    txHash,
    isSimulation,
    simulationDetails,
    resetTransaction,
    isPending,
  } = usePaymentTransaction({ isPara });

  // Check simulation mode when modal opens (only for Para wallets)
  const checkSimulationMode = useCallback(async () => {
    if (!isPara) {
      setIsSystemSimulationMode(false); // Standard wallets don't use simulation
      return;
    }

    try {
      // Pass the connected wallet address to check if it's authorized
      const walletParam = connectedAddress ? `?wallet=${connectedAddress}` : '';
      const response = await fetch(
        `/api/base/check-simulation-mode${walletParam}`
      );
      const data = await response.json();

      if (data.success) {
        setIsSystemSimulationMode(data.isSimulationMode);
      } else {
        console.error('Failed to check simulation mode:', data.error);
        setIsSystemSimulationMode(true); // Default to simulation mode on error
      }
    } catch (error) {
      console.error('Error checking simulation mode:', error);
      setIsSystemSimulationMode(true); // Default to simulation mode on error
    }
  }, [isPara, connectedAddress]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('form');
      setPaymentData({ recipient: initialRecipient, amount: initialAmount });
      resetTransaction();
      checkSimulationMode();
    }
  }, [isOpen, checkSimulationMode, initialRecipient, initialAmount]); // Remove resetTransaction from dependencies

  // Update payment data when initial values change (from QR scanner)
  useEffect(() => {
    console.log('Modal received new initial values:', {
      initialRecipient,
      initialAmount,
    });
    if (isOpen && (initialRecipient || initialAmount)) {
      console.log('Updating payment data with QR scanner data');
      setPaymentData({
        recipient: initialRecipient || paymentData.recipient,
        amount: initialAmount || paymentData.amount,
      });
    }
  }, [isOpen, initialRecipient, initialAmount]);

  const handleFormSubmit = useCallback(
    (recipient: string, amount: string, token: string, chainId: number) => {
      setPaymentData({ recipient, amount, token, chainId });
      setCurrentStep('preview');
    },
    []
  );

  const handleDirectSend = useCallback(
    async (
      recipient: string,
      amount: string,
      token: string,
      chainId: number
    ) => {
      setPaymentData({ recipient, amount, token, chainId });
      setCurrentStep('status');
      await sendTransaction(recipient, amount, token, chainId);
      // Error handling is done through txStatus and txError state
    },
    [sendTransaction]
  );

  const handlePreviewBack = useCallback(() => {
    setCurrentStep('form');
  }, []);

  const handlePreviewConfirm = useCallback(async () => {
    setCurrentStep('status');
    await sendTransaction(
      paymentData.recipient,
      paymentData.amount,
      paymentData.token,
      paymentData.chainId
    );
    // Error handling is done through txStatus and txError state
  }, [
    sendTransaction,
    paymentData.recipient,
    paymentData.amount,
    paymentData.token,
    paymentData.chainId,
  ]);

  const handleStatusDone = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleTryAgain = useCallback(() => {
    // Go back to form step with preserved data
    setCurrentStep('form');
    // Reset transaction state to allow retry
    resetTransaction();
  }, [resetTransaction]);

  const handleClose = useCallback(() => {
    // Don't allow closing during transaction processing
    if (
      txStatus === 'idle' ||
      txStatus === 'confirmed' ||
      txStatus === 'error'
    ) {
      onClose();
    }
  }, [txStatus, onClose]);

  return (
    <Modal open={isOpen} close={handleClose} className="!p-0">
      <ModalContent className="w-[100vw] max-w-xl !h-[100vh] !max-h-[100vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment
            </h2>
            {isPara && isSystemSimulationMode === null && (
              <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                Checking...
              </div>
            )}
            {isPara && isSystemSimulationMode && (
              <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                <svg
                  className="h-3 w-3"
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

          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Content */}
        {currentStep === 'form' && orderStatus !== 'approved' && (
          <PaymentForm
            onSendPayment={handleFormSubmit}
            onDirectSend={handleDirectSend}
            initialRecipient={paymentData.recipient}
            initialAmount={paymentData.amount}
            isPending={isPending}
            showPreview={false}
            isPara={isPara}
            merchantName="Devconnect"
            orderId={orderId}
            connectedAddress={connectedAddress}
          />
        )}

        {currentStep === 'form' && orderStatus === 'approved' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg
                className="h-16 w-16 text-green-500 mx-auto mb-4"
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
              <h3 className="text-xl font-semibold text-green-700 mb-2">
                Payment Already Completed
              </h3>
              <p className="text-gray-600 mb-6">
                This order has already been paid and approved.
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          </div>
        )}

        {currentStep === 'preview' && (
          <PreviewStep
            recipient={paymentData.recipient}
            amount={paymentData.amount}
            isPara={isPara}
            connectedAddress={connectedAddress}
            onConfirm={handlePreviewConfirm}
            onBack={handlePreviewBack}
          />
        )}

        {currentStep === 'status' && (
          <StatusStep
            txStatus={txStatus}
            txError={txError}
            isPara={isPara}
            amount={paymentData.amount}
            connectedAddress={connectedAddress}
            txHash={txHash}
            isSimulation={isSimulation}
            simulationDetails={simulationDetails}
            onDone={handleStatusDone}
            onTryAgain={handleTryAgain}
          />
        )}
      </ModalContent>
    </Modal>
  );
} 
