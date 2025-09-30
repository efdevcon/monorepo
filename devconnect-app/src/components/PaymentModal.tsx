'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalContent } from 'lib/components/modal';
import { Button } from '@/components/ui/button';
import { X, Wallet, Copy, DollarSign, Send, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { base } from '@base-org/account';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { usePaymentTransaction } from '@/hooks/usePaymentTransaction';
import TokenSelector from '@/components/payment/TokenSelector';
import NetworkSelector from '@/components/payment/NetworkSelector';
import NetworkLogo from '@/components/NetworkLogo';
import StatusStep from '@/components/payment/StatusStep';
import { getTokenInfo, getSupportedTokens, tokens } from '@/config/tokens';
import { getNetworkConfig } from '@/config/networks';
import { AUTHORIZED_SPONSOR_ADDRESSES, PAYMENT_CONFIG } from '@/config/config';

type PaymentStep = 'form' | 'status';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPara?: boolean;
  initialRecipient?: string;
  initialAmount?: string;
  orderId?: string;
  orderStatus?: string;
  orderStatusDetail?: string;
  arsAmount?: number;
  priceDetails?: {
    currency: string;
    currency_amount: number;
    currency_final_amount: number;
    base_amount: number;
    final_amount: number;
    paid_amount: number;
    discount_rate: number;
    rate: number;
  };
  paymentRequestId?: string;
  onSendPayment?: (
    recipient: string,
    amount: string,
    token: string,
    chainId: number
  ) => void;
  onDirectSend?: (
    recipient: string,
    amount: string,
    token: string,
    chainId: number
  ) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  isPara = false,
  initialRecipient = '',
  initialAmount = '0.01',
  orderId,
  orderStatus,
  orderStatusDetail,
  arsAmount,
  priceDetails,
  paymentRequestId,
  onSendPayment,
  onDirectSend,
}: PaymentModalProps) {
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

  // PaymentForm state
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [isRecipientValid, setIsRecipientValid] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [isBasePayLoading, setIsBasePayLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [selectedChainId, setSelectedChainId] = useState(8453); // Base

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

  // PaymentForm functions
  const validateAddress = (address: string) => {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address.trim());
  };

  const validateAmount = (value: string) => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 0 && numValue <= 1000; // Max 1000 USDC
  };

  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    setIsRecipientValid(validateAddress(value));
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setIsAmountValid(validateAmount(value));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
      setIsRecipientValid(validateAddress(text));
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      toast.error('Failed to read from clipboard');
    }
  };

  // Handle network changes - for Para wallets, network is fixed to Base
  const handleNetworkChange = (newChainId: number) => {
    // For Para wallets, network is always Base, so don't allow changes
    if (isPara) {
      return;
    }

    setSelectedChainId(newChainId);
  };

  // Handle token changes - network should adapt to support the selected token
  const handleTokenChange = (newToken: string) => {
    setSelectedToken(newToken);

    // Find a network that supports this token
    const supportedNetworks = Object.entries(
      tokens[newToken as keyof typeof tokens]?.addresses || {}
    )
      .filter(([_, address]) => address)
      .map(([chainId, _]) => parseInt(chainId));

    if (supportedNetworks.length > 0) {
      // For Para wallets, only allow Base if it supports the token
      if (isPara) {
        if (supportedNetworks.includes(8453)) {
          setSelectedChainId(8453); // Keep Base for Para
        }
        // If Base doesn't support the token, don't change network (Para restriction)
      } else {
        // For other wallets, prefer Base, then Ethereum, then any other network
        const preferredNetwork = supportedNetworks.includes(8453)
          ? 8453
          : supportedNetworks.includes(1)
            ? 1
            : supportedNetworks[0];
        setSelectedChainId(preferredNetwork);
      }
    }
  };

  // Function to add transaction to payment request
  const addTransactionToPaymentRequest = async (
    token: string,
    chainId: number
  ) => {
    if (!paymentRequestId) return;

    try {
      const response = await fetch(
        `/api/payment-request?paymentId=${paymentRequestId}&ticker=${token}&chainId=${chainId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          'Failed to add transaction to payment request:',
          errorData.error
        );
        toast.error('Failed to add transaction to payment request');
        return false;
      }

      const data = await response.json();
      console.log('Transaction added to payment request:', data);
      return true;
    } catch (error) {
      console.error('Error adding transaction to payment request:', error);
      toast.error('Failed to add transaction to payment request');
      return false;
    }
  };

  const handleBasePay = async () => {
    if (!isRecipientValid) {
      toast.error('Please enter a valid 0x address');
      return;
    }
    if (!isAmountValid || !amount) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsBasePayLoading(true);

    try {
      const result = await base.pay({
        amount,
        to: recipient.trim(),
      });

      toast.success('Base payment successful!');
      return result;
    } catch (error: any) {
      console.error('Payment failed:', error.message);
      toast.error(`Base payment failed: ${error.message}`);
      throw error;
    } finally {
      setIsBasePayLoading(false);
    }
  };

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
      setRecipient(initialRecipient);
      setAmount(initialAmount);
      resetTransaction();
      checkSimulationMode();
    }
  }, [isOpen, checkSimulationMode, initialRecipient, initialAmount]); // Remove resetTransaction from dependencies

  // Validate initial values on mount and when initial values change
  useEffect(() => {
    setIsRecipientValid(validateAddress(initialRecipient));
    setIsAmountValid(validateAmount(initialAmount));
  }, [initialRecipient, initialAmount]);

  // Debug logging for price details
  useEffect(() => {
    console.log('PaymentModal received priceDetails:', priceDetails);
    console.log('PaymentModal received arsAmount:', arsAmount);
  }, [priceDetails, arsAmount]);

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
      setCurrentStep('status');
      // Directly send transaction without preview step
      sendTransaction(recipient, amount, token, chainId);
    },
    [sendTransaction]
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

  const handleSendPayment = async () => {
    if (!isRecipientValid) {
      toast.error('Please enter a valid 0x address');
      return;
    }
    if (!isAmountValid || !amount) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Add transaction to payment request if paymentRequestId is available
    // if (paymentRequestId) {
    //   const success = await addTransactionToPaymentRequest(
    //     selectedToken,
    //     selectedChainId
    //   );
    //   if (!success) {
    //     return; // Stop if adding transaction failed
    //   }
    // }

    if (onDirectSend) {
      onDirectSend(recipient.trim(), amount, selectedToken, selectedChainId);
    } else if (onSendPayment) {
      onSendPayment(recipient.trim(), amount, selectedToken, selectedChainId);
    } else {
      // Fallback to internal form submission
      handleFormSubmit(
        recipient.trim(),
        amount,
        selectedToken,
        selectedChainId
      );
    }
  };

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
          <div className="space-y-6">
            {/* Merchant Information */}
            <div className="text-center space-y-2">
              <h2 className="text-[#20202b] text-base font-bold">Devconnect</h2>
              {orderId && (
                <p className="text-[#353548] text-xs">
                  <span className="font-bold">Order ID:</span> {orderId}
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-end justify-center gap-1">
                  <span className="text-[#4b4b66] text-xl">
                    {priceDetails?.currency || 'ARS'}
                  </span>
                  <span className="text-[#20202b] text-2xl font-bold">
                    {priceDetails?.currency_final_amount?.toLocaleString() ||
                      arsAmount?.toLocaleString() ||
                      '14,100'}
                  </span>
                </div>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-[#4b4b66] text-base">USD</span>
                  <span className="text-[#20202b] text-xl font-bold">
                    {priceDetails?.final_amount?.toFixed(6) || amount}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="space-y-3">
              <h3 className="text-[#353548] text-base font-semibold">
                Payment method
              </h3>
              <TokenSelector
                selectedToken={selectedToken}
                onTokenChange={handleTokenChange}
                chainId={selectedChainId}
                isPara={isPara}
              />
            </div>

            {/* Network Section */}
            <div className="space-y-3">
              <h3 className="text-[#353548] text-base font-semibold">
                Network
              </h3>
              <NetworkSelector
                selectedChainId={selectedChainId}
                onNetworkChange={handleNetworkChange}
                isPara={isPara}
                selectedToken={selectedToken}
              />
              {isPara && (
                <p className="text-xs text-[#4b4b66] bg-gray-50 p-2 rounded">
                  Network is automatically selected based on the chosen payment
                  method
                </p>
              )}
            </div>

            {/* Wallet Section */}
            <div className="space-y-3">
              <h3 className="text-[#353548] text-base font-semibold">Wallet</h3>
              <div className="bg-white border border-[#c7c7d0] rounded-[2px] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <NetworkLogo chainId={selectedChainId} size="sm" />
                  <span className="text-[#353548] text-base font-normal">
                    {isPara ? 'Para' : 'Standard Wallet'}
                  </span>
                </div>
                <ChevronDown className="w-5 h-5 text-[#353548]" />
              </div>

              {/* Connection Status */}
              <div className="bg-[#3a365e] border border-[#f6b613] rounded-[2px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-base font-semibold">
                    Connected to:
                  </span>
                  <div className="flex items-center gap-2">
                    <NetworkLogo chainId={selectedChainId} size="sm" />
                    <span className="text-white text-sm">
                      {connectedAddress
                        ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
                        : 'Not connected'}
                    </span>
                  </div>
                </div>
                {isPara && (
                  <p className="text-[#ededf0] text-xs text-center">
                    <span className="font-bold">Para: </span>
                    <span className="font-normal">
                      This transaction is gas-free
                    </span>
                  </p>
                )}
              </div>
              <button className="text-[#1b6fae] text-sm font-medium">
                SWITCH WALLET (2)
              </button>
            </div>

            {/* Amount to Pay */}
            <div className="border-t border-[#c7c7d0] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[#353548] text-base font-semibold">
                  Amount to pay
                </span>
                <span className="text-[#353548] text-base">
                  {amount}{' '}
                  {getTokenInfo(selectedToken, selectedChainId)?.symbol ||
                    selectedToken}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handleSendPayment}
              disabled={
                !isRecipientValid || !isAmountValid || !amount || isPending
              }
              className="w-full bg-[#137c59] hover:bg-[#0c5039] text-white font-bold py-3 px-6 rounded-[1px] shadow-[0px_4px_0px_0px_#0c5039] transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Pay Devconnect {amount}{' '}
                  {getTokenInfo(selectedToken, selectedChainId)?.symbol ||
                    selectedToken}
                </>
              )}
            </Button>
          </div>
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
