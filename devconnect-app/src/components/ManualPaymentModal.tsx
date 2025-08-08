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

type PaymentStep = 'form' | 'preview' | 'status';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPara?: boolean;
  initialRecipient?: string;
  initialAmount?: string;
  orderId?: string;
}

export default function ManualPaymentModal({
  isOpen,
  onClose,
  isPara = false,
  initialRecipient = '',
  initialAmount = '0.01',
  orderId,
}: ManualPaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('form');
  const [paymentData, setPaymentData] = useState<{
    recipient: string;
    amount: string;
  }>({
    recipient: initialRecipient,
    amount: initialAmount,
  });
  const [isSystemSimulationMode, setIsSystemSimulationMode] = useState<
    boolean | null
  >(null);

  const productUrl =
    'https://www.pagar.simplefi.tech/6603276727aaa6386588474d/products/688ba8db51fc6c100f32cd63';

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

  const handleFormSubmit = useCallback((recipient: string, amount: string) => {
    setPaymentData({ recipient, amount });
    setCurrentStep('preview');
  }, []);

  const handleDirectSend = useCallback(
    async (recipient: string, amount: string) => {
      setPaymentData({ recipient, amount });
      setCurrentStep('status');
      await sendTransaction(recipient, amount);
      // Error handling is done through txStatus and txError state
    },
    [sendTransaction]
  );

  const handlePreviewBack = useCallback(() => {
    setCurrentStep('form');
  }, []);

  const handlePreviewConfirm = useCallback(async () => {
    setCurrentStep('status');
    await sendTransaction(paymentData.recipient, paymentData.amount);
    // Error handling is done through txStatus and txError state
  }, [sendTransaction, paymentData.recipient, paymentData.amount]);

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
    <Modal open={isOpen} close={handleClose} className="p-0">
      <ModalContent className="w-[100vw] max-w-xl max-h-[80vh] overflow-y-auto p-6">
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

        {/* Wallet Connection Status */}
        <div
          className={`rounded-lg p-4 mb-6 ${
            isConnected
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet
              className={`h-5 w-5 ${
                isConnected ? 'text-green-600' : 'text-yellow-600'
              }`}
            />
            <h3 className="font-semibold text-lg">
              {isConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
            </h3>
          </div>
          {isPara && isSystemSimulationMode && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              <div className="font-medium">System Mode:</div>
              <div>
                ⚠️ Simulation mode - transactions will not be executed on
                blockchain
              </div>
              {connectedAddress && (
                <div className="mt-1 text-orange-600">
                  <div>
                    Connected wallet: {connectedAddress.slice(0, 6)}...
                    {connectedAddress.slice(-4)}
                  </div>
                  <div>Required sponsor: 0x20c8...4cdd</div>
                  <div>
                    Only the authorized sponsor wallet can execute real
                    transactions
                  </div>
                </div>
              )}
            </div>
          )}
          {isConnected ? (
            <div className="space-y-2">
              <p className="text-sm text-green-700">
                Connected: {connectedAddress?.slice(0, 6)}...
                {connectedAddress?.slice(-4)}
              </p>
              <p className="text-sm text-green-700">
                Wallet Type: {isPara ? 'Para Wallet' : 'Standard Wallet'}
              </p>
              {isPara && (
                <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                  <div className="font-medium">Para Wallet Benefits:</div>
                  <div>• Gas-free transactions</div>
                  <div>• Enhanced security with authorization</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-yellow-700">
              Please connect your wallet to make a payment
            </p>
          )}
        </div>

        {/* Order ID */}
        {orderId && (
          <div className="bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="font-semibold text-lg">Order Information</h3>
            </div>
            <div className="text-blue-800 font-mono text-lg">
              Order ID: {orderId}
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 'form' && (
          <PaymentForm
            onSendPayment={handleFormSubmit}
            onDirectSend={handleDirectSend}
            initialRecipient={paymentData.recipient}
            initialAmount={paymentData.amount}
            isPending={isPending}
            showPreview={false}
          />
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
