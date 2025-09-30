'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    recipient: '',
    amount: '0.01',
  });
  const [isSystemSimulationMode, setIsSystemSimulationMode] = useState<
    boolean | null
  >(null);

  // Payment details state
  const [paymentDetails, setPaymentDetails] = useState<{
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
    recipient?: string;
    amount?: string;
    transactions?: Array<{
      id: string;
      coin: string;
      chain_id: number;
      address: string;
      status: string;
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
    }>;
  }>({});
  const [isLoadingPaymentDetails, setIsLoadingPaymentDetails] = useState(false);
  const [paymentDetailsError, setPaymentDetailsError] = useState<string | null>(
    null
  );
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // PaymentForm state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [isRecipientValid, setIsRecipientValid] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [isBasePayLoading, setIsBasePayLoading] = useState(false);
  // Load selected token and chain from localStorage, with fallbacks
  const [selectedToken, setSelectedToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedToken') || 'USDC';
    }
    return 'USDC';
  });
  const [selectedChainId, setSelectedChainId] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('selectedChainId') || '8453');
    }
    return 8453; // Base
  });

  const productUrl = `${PAYMENT_CONFIG.SIMPLEFI_BASE_URL}/${PAYMENT_CONFIG.MERCHANT_ID}/products/688ba8db51fc6c100f32cd63`;

  // Helper functions to update localStorage and state
  const updateSelectedToken = useCallback((token: string) => {
    setSelectedToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedToken', token);
    }
  }, []);

  const updateSelectedChainId = useCallback((chainId: number) => {
    setSelectedChainId(chainId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedChainId', chainId.toString());
    }
  }, []);

  // Function to fetch payment details from payment-status API
  const fetchPaymentDetails = async (paymentRequestId: string) => {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/payment-status/${paymentRequestId}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error(
            'Payment service is temporarily unavailable. Please try again.'
          );
        }

        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  };

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
  const handleNetworkChange = async (newChainId: number) => {
    console.log('handleNetworkChange called with:', newChainId);
    console.log('Current selectedToken:', selectedToken);
    console.log('Current selectedChainId:', selectedChainId);

    // For Para wallets, network is always Base, so don't allow changes
    if (isPara) {
      console.log('Para wallet - network change blocked');
      return;
    }

    updateSelectedChainId(newChainId);
    console.log('Updated selectedChainId to:', newChainId);

    // Update paymentData with the new chainId immediately
    setPaymentData((prev) => ({
      ...prev,
      chainId: newChainId,
    }));

    // Check if a transaction already exists for this token/chain combination
    if (paymentRequestId && paymentDetails.transactions) {
      const existingTransaction = paymentDetails.transactions.find(
        (tx: any) => tx.coin === selectedToken && tx.chain_id === newChainId
      );

      if (!existingTransaction) {
        // No transaction exists for this token/chain, create one
        console.log(
          `No transaction found for ${selectedToken} on chain ${newChainId}, creating new transaction`
        );
        console.log('About to create transaction with:', {
          selectedToken,
          newChainId,
        });
        setIsAddingTransaction(true);
        try {
          const success = await addTransactionToPaymentRequest(
            selectedToken,
            newChainId
          );
          if (success) {
            toast.success(
              `Added ${selectedToken} transaction to payment request`
            );
            // Refresh payment details to get the new transaction
            await refreshPaymentDetails(selectedToken, newChainId);
          } else {
            // Don't show error toast here as it's already shown in addTransactionToPaymentRequest
            console.log(`Failed to add ${selectedToken} transaction`);
          }
        } catch (error) {
          console.error('Error adding transaction:', error);
          toast.error(`Failed to add ${selectedToken} transaction`);
        } finally {
          setIsAddingTransaction(false);
        }
      } else {
        // Transaction already exists, update amounts immediately
        console.log(
          `Found existing transaction for ${selectedToken} on chain ${newChainId}`
        );
        updateAmountsFromTransaction(existingTransaction);
      }
    }
  };

  // Handle token changes - network should adapt to support the selected token
  const handleTokenChange = async (newToken: string) => {
    console.log('handleTokenChange called with:', newToken);
    updateSelectedToken(newToken);

    // Find a network that supports this token
    const supportedNetworks = Object.entries(
      tokens[newToken as keyof typeof tokens]?.addresses || {}
    )
      .filter(([_, address]) => address)
      .map(([chainId, _]) => parseInt(chainId));

    console.log('Supported networks for', newToken, ':', supportedNetworks);

    if (supportedNetworks.length > 0) {
      let newChainId: number;

      // For Para wallets, only allow Base if it supports the token
      if (isPara) {
        if (supportedNetworks.includes(8453)) {
          newChainId = 8453; // Keep Base for Para
        } else {
          // If Base doesn't support the token, don't change network (Para restriction)
          console.log('Token not supported on Base for Para wallet');
          return;
        }
      } else {
        // For other wallets, prefer Base, then Ethereum, then any other network
        newChainId = supportedNetworks.includes(8453)
          ? 8453
          : supportedNetworks.includes(1)
            ? 1
            : supportedNetworks[0];
      }

      console.log('Selected chain ID for', newToken, ':', newChainId);
      updateSelectedChainId(newChainId);

      // Update paymentData with the new token and chainId immediately
      setPaymentData((prev) => ({
        ...prev,
        token: newToken,
        chainId: newChainId,
      }));

      // Check if a transaction already exists for this token/chain combination
      if (paymentRequestId && paymentDetails.transactions) {
        const existingTransaction = paymentDetails.transactions.find(
          (tx: any) => tx.coin === newToken && tx.chain_id === newChainId
        );

        if (!existingTransaction) {
          // No transaction exists for this token/chain, create one
          console.log(
            `No transaction found for ${newToken} on chain ${newChainId}, creating new transaction`
          );
          setIsAddingTransaction(true);
          try {
            const success = await addTransactionToPaymentRequest(
              newToken,
              newChainId
            );
            if (success) {
              toast.success(`Added ${newToken} transaction to payment request`);
              // Refresh payment details to get the new transaction
              await refreshPaymentDetails(newToken, newChainId);
            } else {
              // Don't show error toast here as it's already shown in addTransactionToPaymentRequest
              console.log(`Failed to add ${newToken} transaction`);
            }
          } catch (error) {
            console.error('Error adding transaction:', error);
            toast.error(`Failed to add ${newToken} transaction`);
          } finally {
            setIsAddingTransaction(false);
          }
        } else {
          // Transaction already exists, update amounts immediately
          console.log(
            `Found existing transaction for ${newToken} on chain ${newChainId}`
          );
          updateAmountsFromTransaction(existingTransaction);
        }
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
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        `/api/payment-request?paymentId=${paymentRequestId}&ticker=${token}&chainId=${chainId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504) {
          console.error(
            'Gateway timeout when adding transaction to payment request'
          );
          toast.error(
            'Payment service is temporarily unavailable. Please try again.'
          );
          return false;
        }

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

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Failed to add transaction to payment request');
      }
      return false;
    }
  };

  // Function to refresh payment details after adding a transaction
  const refreshPaymentDetails = async (token?: string, chainId?: number) => {
    if (!paymentRequestId) return;

    // Use passed parameters or current state
    const currentToken = token || selectedToken;
    const currentChainId = chainId || selectedChainId;

    console.log('refreshPaymentDetails called with:', {
      token: currentToken,
      chainId: currentChainId,
      fromParams: !!(token && chainId),
    });

    try {
      const details = await fetchPaymentDetails(paymentRequestId);
      console.log('Payment details refreshed:', details);

      // Update payment details with fresh data
      if (details.transactions && details.transactions.length > 0) {
        console.log(
          'refreshPaymentDetails - available transactions:',
          details.transactions.map((tx: any) => ({
            coin: tx.coin,
            chain_id: tx.chain_id,
            final_amount: tx.price_details?.final_amount,
          }))
        );
        console.log('refreshPaymentDetails - looking for:', {
          selectedToken: currentToken,
          selectedChainId: currentChainId,
        });

        // Find the transaction that matches the current user selection
        const matchingTransaction = details.transactions.find(
          (tx: any) =>
            tx.coin === currentToken && tx.chain_id === currentChainId
        );

        console.log(
          'refreshPaymentDetails - matching transaction:',
          matchingTransaction
            ? {
                coin: matchingTransaction.coin,
                chain_id: matchingTransaction.chain_id,
                final_amount: matchingTransaction.price_details?.final_amount,
              }
            : 'No matching transaction found'
        );

        // Use the matching transaction if found, otherwise use the first transaction
        const transactionToUse = matchingTransaction || details.transactions[0];

        console.log('refreshPaymentDetails - using transaction:', {
          coin: transactionToUse.coin,
          chain_id: transactionToUse.chain_id,
          final_amount: transactionToUse.price_details?.final_amount,
        });

        // Only update selected token and chain if we don't have a current selection
        // This preserves the user's selection when refreshing after adding a new transaction
        if (!selectedToken || !selectedChainId) {
          updateSelectedToken(transactionToUse.coin);
          updateSelectedChainId(transactionToUse.chain_id);
        }

        const paymentData = {
          orderId: details.order_id?.toString(),
          orderStatus: details.status,
          orderStatusDetail: details.status_detail,
          arsAmount: details.ars_amount,
          priceDetails: transactionToUse.price_details,
          recipient: transactionToUse.address,
          amount:
            transactionToUse.price_details?.final_amount?.toString() || '0.01',
          transactions: details.transactions,
        };

        setPaymentDetails(paymentData);

        // Update all the form fields with the transaction data using the helper
        updateAmountsFromTransaction(transactionToUse);
      } else {
        // Update transactions array even if empty
        setPaymentDetails((prev) => ({
          ...prev,
          transactions: details.transactions || [],
        }));
      }
    } catch (error) {
      console.error('Error refreshing payment details:', error);
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

  // Fetch payment details when modal opens with paymentRequestId
  useEffect(() => {
    if (isOpen && paymentRequestId) {
      const loadPaymentDetails = async () => {
        setIsLoadingPaymentDetails(true);
        setPaymentDetailsError(null);

        try {
          const details = await fetchPaymentDetails(paymentRequestId);
          console.log('Payment details fetched:', details);

          // Extract transaction data from the first transaction
          if (details.transactions && details.transactions.length > 0) {
            // On initial load, always use the first transaction to set the correct token/chain
            const transaction = details.transactions[0];

            const paymentData = {
              orderId: details.order_id?.toString(),
              orderStatus: details.status,
              orderStatusDetail: details.status_detail,
              arsAmount: details.ars_amount,
              priceDetails: transaction.price_details,
              recipient: transaction.address,
              amount:
                transaction.price_details?.final_amount?.toString() || '0.01',
              transactions: details.transactions,
            };

            // Set the selected token and chain to match the first transaction FIRST
            updateSelectedToken(transaction.coin);
            updateSelectedChainId(transaction.chain_id);

            setPaymentDetails(paymentData);
            setRecipient(transaction.address);
            setAmount(
              transaction.price_details?.final_amount?.toString() || '0.01'
            );
            setPaymentData({
              recipient: transaction.address,
              amount:
                transaction.price_details?.final_amount?.toString() || '0.01',
            });

            // Validate the recipient and amount after setting them
            const recipientValid = validateAddress(transaction.address);
            const amountValid = validateAmount(
              transaction.price_details?.final_amount?.toString() || '0.01'
            );
            console.log('Initial load validation:', {
              recipient: transaction.address,
              amount: transaction.price_details?.final_amount?.toString(),
              recipientValid,
              amountValid,
            });
            setIsRecipientValid(recipientValid);
            setIsAmountValid(amountValid);

            // Mark initial load as complete
            setIsInitialLoad(false);
          } else {
            // No transactions found, create one with default values
            console.log('No transactions found, creating new transaction');

            // Create a transaction with default USDC on Base
            const success = await addTransactionToPaymentRequest('USDC', 8453);
            if (success) {
              // Refresh payment details to get the new transaction data
              await refreshPaymentDetails('USDC', 8453);

              // Mark initial load as complete
              setIsInitialLoad(false);
            } else {
              setPaymentDetailsError(
                'Failed to create transaction for this payment request'
              );
            }
          }
        } catch (error) {
          console.error('Error loading payment details:', error);

          let errorMessage = 'Failed to fetch payment details';
          if (error instanceof Error) {
            if (error.message.includes('temporarily unavailable')) {
              errorMessage =
                'Payment service is temporarily unavailable. Please try again.';
            } else if (
              error.message.includes('timeout') ||
              error.name === 'AbortError'
            ) {
              errorMessage = 'Request timed out. Please try again.';
            } else {
              errorMessage = error.message;
            }
          }

          setPaymentDetailsError(errorMessage);
        } finally {
          setIsLoadingPaymentDetails(false);
        }
      };

      loadPaymentDetails();
    }
  }, [isOpen, paymentRequestId]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('form');
      setPaymentData({ recipient: '', amount: '0.01' });
      setRecipient('');
      setAmount('0.01');
      resetTransaction();
      checkSimulationMode();
      setIsInitialLoad(true); // Reset initial load flag
    }
  }, [isOpen, checkSimulationMode]); // Remove resetTransaction from dependencies

  // Validate recipient and amount when they change
  useEffect(() => {
    setIsRecipientValid(validateAddress(recipient));
    setIsAmountValid(validateAmount(amount));
  }, [recipient, amount]);

  // Helper function to update amounts from a specific transaction
  const updateAmountsFromTransaction = useCallback((transaction: any) => {
    console.log('Updating amounts from transaction:', {
      coin: transaction.coin,
      chain_id: transaction.chain_id,
      final_amount: transaction.price_details?.final_amount,
    });

    setAmount(transaction.price_details?.final_amount?.toString() || '0.01');
    setRecipient(transaction.address);
    setPaymentData({
      recipient: transaction.address,
      amount: transaction.price_details?.final_amount?.toString() || '0.01',
    });

    setPaymentDetails((prev) => ({
      ...prev,
      priceDetails: transaction.price_details,
      recipient: transaction.address,
      amount: transaction.price_details?.final_amount?.toString() || '0.01',
    }));
  }, []);

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
        {currentStep === 'form' &&
          paymentDetails.orderStatus !== 'approved' && (
            <div className="space-y-6">
              {/* Loading State */}
              {isLoadingPaymentDetails && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading payment details...</p>
                </div>
              )}

              {/* Error State */}
              {paymentDetailsError && (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-4">
                    <svg
                      className="h-12 w-12 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="font-semibold">
                      Error loading payment details
                    </p>
                    <p className="text-sm">{paymentDetailsError}</p>
                  </div>
                  <Button onClick={onClose} variant="outline">
                    Close
                  </Button>
                </div>
              )}

              {/* Payment Form */}
              {!isLoadingPaymentDetails && !paymentDetailsError && (
                <>
                  {/* Merchant Information */}
                  <div className="text-center space-y-2">
                    <h2 className="text-[#20202b] text-base font-bold">
                      Devconnect
                    </h2>
                    {paymentDetails.orderId && (
                      <p className="text-[#353548] text-xs">
                        <span className="font-bold">Order ID:</span>{' '}
                        {paymentDetails.orderId}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-[#4b4b66] text-xl">
                          {paymentDetails.priceDetails?.currency || 'ARS'}
                        </span>
                        <span className="text-[#20202b] text-2xl font-bold">
                          {paymentDetails.priceDetails?.currency_final_amount?.toLocaleString() ||
                            paymentDetails.arsAmount?.toLocaleString() ||
                            '15'}
                        </span>
                      </div>
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-[#4b4b66] text-base">
                          {selectedToken}
                        </span>
                        <span className="text-[#20202b] text-xl font-bold">
                          {paymentDetails.priceDetails?.final_amount?.toFixed(
                            6
                          ) ||
                            paymentDetails.amount ||
                            amount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Section */}
                  <div className="space-y-3">
                    <h3 className="text-[#353548] text-base font-semibold">
                      Payment method
                    </h3>
                    <div className="relative">
                      <TokenSelector
                        selectedToken={selectedToken}
                        onTokenChange={handleTokenChange}
                        chainId={selectedChainId}
                        isPara={isPara}
                      />
                      {isAddingTransaction && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            Adding transaction...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network Section */}
                  <div className="space-y-3">
                    <h3 className="text-[#353548] text-base font-semibold">
                      Network
                    </h3>
                    <div className="relative">
                      <NetworkSelector
                        selectedChainId={selectedChainId}
                        onNetworkChange={handleNetworkChange}
                        isPara={isPara}
                        selectedToken={selectedToken}
                      />
                      {isAddingTransaction && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            Adding transaction...
                          </div>
                        </div>
                      )}
                    </div>
                    {isPara && (
                      <p className="text-xs text-[#4b4b66] bg-gray-50 p-2 rounded">
                        Network is automatically selected based on the chosen
                        payment method
                      </p>
                    )}
                  </div>

                  {/* Wallet Section */}
                  <div className="space-y-3">
                    <h3 className="text-[#353548] text-base font-semibold">
                      Wallet
                    </h3>
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
                        {paymentDetails.priceDetails?.final_amount?.toFixed(
                          6
                        ) || amount}{' '}
                        {getTokenInfo(selectedToken, selectedChainId)?.symbol ||
                          selectedToken}
                      </span>
                    </div>
                  </div>

                  {/* Pay Button */}
                  <Button
                    onClick={handleSendPayment}
                    disabled={
                      !isRecipientValid ||
                      !isAmountValid ||
                      !amount ||
                      isPending
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
                        Pay Devconnect{' '}
                        {paymentDetails.priceDetails?.final_amount?.toFixed(
                          6
                        ) || amount}{' '}
                        {getTokenInfo(selectedToken, selectedChainId)?.symbol ||
                          selectedToken}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

        {currentStep === 'form' &&
          paymentDetails.orderStatus === 'approved' && (
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
