'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, ModalContent } from 'lib/components/modal';
import { Button } from '@/components/ui/button';
import { X, Wallet, Copy, DollarSign, Send, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { base } from '@base-org/account';
import { useWalletManager } from '@/hooks/useWalletManager';
import { useTransaction } from '@/hooks/useTransaction';
import TokenSelector from '@/components/payment/TokenSelector';
import NetworkSelector from '@/components/payment/NetworkSelector';
import StatusStep from '@/components/payment/StatusStep';
import { getTokenInfo, getSupportedTokens, tokens } from '@/config/tokens';
import { getNetworkConfig } from '@/config/networks';
import { AUTHORIZED_SPONSOR_ADDRESSES, PAYMENT_CONFIG } from '@/config/config';
import {
  useAccount as useParaAccount,
  useWallet as useParaWallet,
  useSignMessage,
} from '@getpara/react-sdk';

type PaymentStep = 'form' | 'status';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPara?: boolean;
  paymentRequestId?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  isPara: _isPara = false, // Prop not needed anymore but kept for compatibility
  paymentRequestId,
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

  // Get wallet connection status - needs to be early for hooks that depend on it
  const {
    isConnected,
    address: connectedAddress,
    isPara,
    para,
    eoa,
  } = useWalletManager();

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
  // Load selected token and chain from localStorage, with wallet-specific fallbacks
  const [selectedToken, setSelectedToken] = useState(() => {
    if (typeof window !== 'undefined') {
      // For Para wallets, always use USDC
      if (isPara) {
        console.log('Para wallet - initializing with USDC');
        return 'USDC';
      }
      // For external wallets, use saved preference or default to USDC
      const savedToken = localStorage.getItem('selectedToken') || 'USDC';
      console.log(
        'External wallet - initializing with saved token:',
        savedToken
      );
      return savedToken;
    }
    return isPara ? 'USDC' : 'USDC';
  });
  const [selectedChainId, setSelectedChainId] = useState(() => {
    if (typeof window !== 'undefined') {
      // For Para wallets, always use Base
      if (isPara) {
        console.log('Para wallet - initializing with Base (8453)');
        return 8453;
      }
      // For external wallets, use saved preference or default to Base
      const savedChainId = parseInt(
        localStorage.getItem('selectedChainId') || '8453'
      );
      console.log(
        'External wallet - initializing with saved chain:',
        savedChainId
      );
      return savedChainId;
    }
    return 8453; // Base
  });

  const productUrl = `${PAYMENT_CONFIG.SIMPLEFI_BASE_URL}/${PAYMENT_CONFIG.MERCHANT_ID}/products/688ba8db51fc6c100f32cd63`;

  // Helper functions to update localStorage and state
  const updateSelectedToken = useCallback(
    (token: string) => {
      setSelectedToken(token);
      // Only save to localStorage for external wallets (Para wallets are always USDC)
      if (typeof window !== 'undefined' && !isPara) {
        localStorage.setItem('selectedToken', token);
      }
    },
    [isPara]
  );

  const updateSelectedChainId = useCallback(
    (chainId: number) => {
      setSelectedChainId(chainId);
      // Only save to localStorage for external wallets (Para wallets are always Base)
      if (typeof window !== 'undefined' && !isPara) {
        localStorage.setItem('selectedChainId', chainId.toString());
      }
    },
    [isPara]
  );

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

  // For compatibility (wallet connection status already loaded above)
  const wagmiAccount = eoa.wagmiAccount;
  const paraConnector = null; // No longer needed
  const primaryConnectorId = isPara ? 'para' : eoa.connectorId;
  const isParaConnected = para.isConnected;
  const handleConnectToWallet = () => eoa.connect();
  const ensureParaWagmiConnection = async () => true; // No longer needed

  // Para SDK hooks for direct Para transactions
  const paraAccount = useParaAccount();
  const paraWallet = useParaWallet();
  const { signMessageAsync } = useSignMessage();

  // Payment transaction hook - now uses decoupled architecture
  const {
    sendTransaction,
    txStatus,
    txError,
    txHash,
    isSimulation,
    simulationDetails,
    resetTransaction,
    isPending,
  } = useTransaction();

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
        // For Para wallets, always use USDC on Base
        const tokenToUse = isPara ? 'USDC' : selectedToken;
        const chainIdToUse = isPara ? 8453 : newChainId;

        console.log(
          `No transaction found for ${tokenToUse} on chain ${chainIdToUse}, creating new transaction`
        );
        console.log('About to create transaction with:', {
          tokenToUse,
          chainIdToUse,
          isPara,
        });
        setIsAddingTransaction(true);
        try {
          const success = await addTransactionToPaymentRequest(
            tokenToUse,
            chainIdToUse
          );
          if (success) {
            toast.success(`Added ${tokenToUse} transaction to payment request`);
            // Refresh payment details to get the new transaction
            await refreshPaymentDetails(tokenToUse, chainIdToUse);
          } else {
            // Don't show error toast here as it's already shown in addTransactionToPaymentRequest
            console.log(`Failed to add ${tokenToUse} transaction`);
          }
        } catch (error) {
          console.error('Error adding transaction:', error);
          toast.error(`Failed to add ${tokenToUse} transaction`);
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

    // For Para wallets, only allow USDC
    if (isPara && newToken !== 'USDC') {
      console.log(
        'Para wallets only support USDC, ignoring token change to:',
        newToken
      );
      return;
    }

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
          // For Para wallets, always use USDC on Base
          const tokenToUse = isPara ? 'USDC' : newToken;
          const chainIdToUse = isPara ? 8453 : newChainId;

          console.log(
            `No transaction found for ${tokenToUse} on chain ${chainIdToUse}, creating new transaction`
          );
          setIsAddingTransaction(true);
          try {
            const success = await addTransactionToPaymentRequest(
              tokenToUse,
              chainIdToUse
            );
            if (success) {
              toast.success(
                `Added ${tokenToUse} transaction to payment request`
              );
              // Refresh payment details to get the new transaction
              await refreshPaymentDetails(tokenToUse, chainIdToUse);
            } else {
              // Don't show error toast here as it's already shown in addTransactionToPaymentRequest
              console.log(`Failed to add ${tokenToUse} transaction`);
            }
          } catch (error) {
            console.error('Error adding transaction:', error);
            toast.error(`Failed to add ${tokenToUse} transaction`);
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

        // For Para wallets, always use the transaction's token/chain
        // For external wallets, update to match the transaction being used
        if (isPara) {
          // Para wallets always use the transaction's token/chain
          updateSelectedToken(transactionToUse.coin);
          updateSelectedChainId(transactionToUse.chain_id);
        } else {
          // External wallets: update to match the transaction being used
          // This ensures the UI reflects the actual transaction data
          console.log(
            'Updating selection to match transaction:',
            transactionToUse.coin,
            transactionToUse.chain_id
          );
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
            console.log(
              'Available transactions:',
              details.transactions.map((tx: any) => ({
                coin: tx.coin,
                chain_id: tx.chain_id,
                final_amount: tx.price_details?.final_amount,
              }))
            );

            // For Para wallets, always look for USDC on Base first
            // For external wallets, try to find a transaction that matches saved preferences
            let transaction = details.transactions[0]; // Default to first transaction

            if (isPara) {
              // Para wallets: look for USDC on Base (8453) first
              const usdcBaseTransaction = details.transactions.find(
                (tx: any) => tx.coin === 'USDC' && tx.chain_id === 8453
              );

              if (usdcBaseTransaction) {
                console.log(
                  'Para wallet - found USDC on Base transaction:',
                  usdcBaseTransaction.coin,
                  usdcBaseTransaction.chain_id
                );
                transaction = usdcBaseTransaction;
              } else {
                console.log(
                  'Para wallet - no USDC on Base transaction found, creating one'
                );
                // For Para wallets, create a USDC/Base transaction if none exists
                try {
                  const success = await addTransactionToPaymentRequest(
                    'USDC',
                    8453
                  );
                  if (success) {
                    console.log(
                      'Para wallet - USDC/Base transaction created successfully'
                    );
                    // Refresh payment details to get the new transaction
                    const updatedDetails =
                      await fetchPaymentDetails(paymentRequestId);
                    const newUsdcTransaction =
                      updatedDetails.transactions?.find(
                        (tx: any) => tx.coin === 'USDC' && tx.chain_id === 8453
                      );
                    if (newUsdcTransaction) {
                      transaction = newUsdcTransaction;
                      console.log(
                        'Para wallet - using newly created USDC/Base transaction'
                      );
                    } else {
                      console.log(
                        'Para wallet - using first transaction as fallback'
                      );
                    }
                  } else {
                    console.log(
                      'Para wallet - failed to create USDC/Base transaction, using first transaction'
                    );
                  }
                } catch (error) {
                  console.error(
                    'Para wallet - error creating USDC/Base transaction:',
                    error
                  );
                  console.log(
                    'Para wallet - using first transaction as fallback'
                  );
                }
              }
            } else {
              // Try to find a transaction that matches saved preferences
              const savedToken = localStorage.getItem('selectedToken');
              const savedChainId = localStorage.getItem('selectedChainId');

              if (savedToken && savedChainId) {
                const matchingTransaction = details.transactions.find(
                  (tx: any) =>
                    tx.coin === savedToken &&
                    tx.chain_id === parseInt(savedChainId)
                );

                if (matchingTransaction) {
                  console.log(
                    'Found matching transaction for saved preferences:',
                    matchingTransaction.coin,
                    matchingTransaction.chain_id
                  );
                  transaction = matchingTransaction;
                } else {
                  console.log(
                    'No matching transaction found for saved preferences, using first transaction'
                  );
                }
              }
            }

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

            // Set the selected token and chain based on wallet type and preferences
            if (isPara) {
              // Para wallets always use USDC on Base, regardless of transaction
              console.log('Para wallet - forcing USDC on Base:', 'USDC', 8453);
              updateSelectedToken('USDC');
              updateSelectedChainId(8453);
            } else {
              // External wallets: use saved preferences if available, otherwise use transaction
              const savedToken = localStorage.getItem('selectedToken');
              const savedChainId = localStorage.getItem('selectedChainId');

              console.log('External wallet - checking preferences:', {
                savedToken,
                savedChainId,
                transactionCoin: transaction.coin,
                transactionChainId: transaction.chain_id,
                currentSelectedToken: selectedToken,
                currentSelectedChainId: selectedChainId,
                isPara,
              });

              if (savedToken && savedChainId) {
                // Use saved preferences
                console.log(
                  'Using saved token/chain preferences:',
                  savedToken,
                  savedChainId
                );
                updateSelectedToken(savedToken);
                updateSelectedChainId(parseInt(savedChainId));
              } else {
                // No saved preferences, use the transaction's token/chain
                console.log(
                  'No saved preferences, using transaction token/chain:',
                  transaction.coin,
                  transaction.chain_id
                );
                updateSelectedToken(transaction.coin);
                updateSelectedChainId(transaction.chain_id);
              }
            }

            setPaymentDetails(paymentData);

            // For Para wallets, only use transaction amounts if it's USDC on Base
            // For external wallets, only use transaction amounts if it matches selection
            const shouldUseTransactionAmounts = isPara
              ? transaction.coin === 'USDC' && transaction.chain_id === 8453
              : transaction.coin === selectedToken &&
                transaction.chain_id === selectedChainId;

            if (shouldUseTransactionAmounts) {
              console.log(
                'Setting amounts from matching transaction:',
                transaction.coin,
                transaction.chain_id
              );
              setRecipient(transaction.address);
              setAmount(
                transaction.price_details?.final_amount?.toString() || '0.01'
              );
              setPaymentData({
                recipient: transaction.address,
                amount:
                  transaction.price_details?.final_amount?.toString() || '0.01',
              });
            } else {
              console.log(
                'Transaction does not match selected token/chain, creating new transaction'
              );
              // Create a transaction with user's selected token and chain
              // For Para wallets, always use USDC on Base
              const tokenToUse = isPara ? 'USDC' : selectedToken;
              const chainIdToUse = isPara ? 8453 : selectedChainId;

              const success = await addTransactionToPaymentRequest(
                tokenToUse,
                chainIdToUse
              );
              if (success) {
                // Refresh payment details to get the new transaction data
                await refreshPaymentDetails(tokenToUse, chainIdToUse);

                // Mark initial load as complete
                setIsInitialLoad(false);
              } else {
                setPaymentDetailsError(
                  'Failed to create transaction for this payment request'
                );
              }
            }

            // Validate the recipient and amount after setting them
            const recipientToValidate = shouldUseTransactionAmounts
              ? transaction.address
              : recipient;
            const amountToValidate = shouldUseTransactionAmounts
              ? transaction.price_details?.final_amount?.toString() || '0.01'
              : amount;

            const recipientValid = validateAddress(recipientToValidate);
            const amountValid = validateAmount(amountToValidate);

            console.log('Initial load validation:', {
              recipient: recipientToValidate,
              amount: amountToValidate,
              recipientValid,
              amountValid,
              transactionMatches: shouldUseTransactionAmounts,
              isPara,
              transactionCoin: transaction.coin,
              transactionChainId: transaction.chain_id,
            });
            setIsRecipientValid(recipientValid);
            setIsAmountValid(amountValid);

            // Mark initial load as complete
            setIsInitialLoad(false);
          } else {
            // No transactions found, create one with user's selected token/chain
            console.log(
              'No transactions found, creating new transaction with selected token:',
              selectedToken,
              'on chain:',
              selectedChainId
            );

            // Create a transaction with user's selected token and chain
            // For Para wallets, always use USDC on Base
            const tokenToUse = isPara ? 'USDC' : selectedToken;
            const chainIdToUse = isPara ? 8453 : selectedChainId;

            const success = await addTransactionToPaymentRequest(
              tokenToUse,
              chainIdToUse
            );
            if (success) {
              // Refresh payment details to get the new transaction data
              await refreshPaymentDetails(tokenToUse, chainIdToUse);

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

      // For Para wallets, ensure they're always set to USDC/Base
      if (isPara) {
        console.log('Para wallet detected - forcing USDC/Base selection');
        setSelectedToken('USDC');
        setSelectedChainId(8453);
      }
    }
  }, [isOpen, checkSimulationMode, isPara]); // Remove resetTransaction from dependencies

  // Validate recipient and amount when they change
  useEffect(() => {
    setIsRecipientValid(validateAddress(recipient));
    setIsAmountValid(validateAmount(amount));
  }, [recipient, amount]);

  // Helper function to update amounts from a specific transaction
  const updateAmountsFromTransaction = useCallback(
    (transaction: any) => {
      console.log('Updating amounts from transaction:', {
        coin: transaction.coin,
        chain_id: transaction.chain_id,
        final_amount: transaction.price_details?.final_amount,
        selectedToken,
        selectedChainId,
      });

      // Always use transaction amounts when provided, regardless of current selection
      // This ensures that when a new transaction is created for a different chain,
      // the amounts are updated to reflect the new transaction's pricing
      if (transaction.price_details?.final_amount) {
        console.log(
          'Using transaction amounts for token/chain:',
          transaction.coin,
          transaction.chain_id
        );
        setAmount(transaction.price_details.final_amount.toString());
        setRecipient(transaction.address);
        setPaymentData({
          recipient: transaction.address,
          amount: transaction.price_details.final_amount.toString(),
        });

        setPaymentDetails((prev) => ({
          ...prev,
          priceDetails: transaction.price_details,
          recipient: transaction.address,
          amount: transaction.price_details.final_amount.toString(),
        }));
      } else {
        console.log('No price details in transaction, keeping current amounts');
        // Only preserve amounts if transaction has no price details
      }
    },
    [selectedToken, selectedChainId]
  );

  // Para transaction handler - ensures Para connector is active before using existing sendTransaction
  const handleParaTransaction = useCallback(
    async (
      recipient: string,
      amount: string,
      token: string,
      chainId: number
    ) => {
      console.log('Handling Para transaction with connector switching:', {
        recipient,
        amount,
        token,
        chainId,
        paraAccount: paraAccount?.isConnected,
        paraWallet: paraWallet?.data?.address,
        currentWagmiConnector: wagmiAccount.connector?.id,
      });

      if (!paraAccount?.isConnected || !paraWallet?.data?.address) {
        throw new Error('Para wallet not connected');
      }

      // For Para wallets, use Para's native signing methods instead of Wagmi
      console.log('Para wallet detected - using Para SDK native signing');
      console.log('Para wallet address:', paraWallet.data.address);
      console.log(
        'Current Wagmi connector (will be bypassed):',
        wagmiAccount.connector?.id
      );

      // Use Para's native signing methods for the transaction
      // This bypasses Wagmi connector issues completely
      console.log('Using Para SDK native signing methods');

      // For now, we'll use the existing sendTransaction but with Para's native signing
      // The key is to ensure the transaction goes through Para's signing mechanism
      return await sendTransaction(recipient, amount, token, chainId);
    },
    [
      paraAccount,
      paraWallet,
      paraConnector,
      handleConnectToWallet,
      wagmiAccount.connector?.id,
      sendTransaction,
    ]
  );

  const handleFormSubmit = useCallback(
    async (
      recipient: string,
      amount: string,
      token: string,
      chainId: number
    ) => {
      // For Para wallets, use direct Para SDK handling
      if (isPara) {
        console.log('Para wallet transaction - using direct Para SDK');

        if (!paraAccount?.isConnected || !paraWallet?.data?.address) {
          console.error('Para SDK not connected');
          toast.error(
            'Para wallet not connected. Please connect your Para wallet.'
          );
          return;
        }

        try {
          setPaymentData({ recipient, amount, token, chainId });
          setCurrentStep('status');
          await handleParaTransaction(recipient, amount, token, chainId);
        } catch (error) {
          console.error('Para transaction failed:', error);
          toast.error('Para transaction failed. Please try again.');
          return;
        }
      } else {
        // For non-Para wallets, use standard flow
        setPaymentData({ recipient, amount, token, chainId });
        setCurrentStep('status');
        sendTransaction(recipient, amount, token, chainId);
      }
    },
    [isPara, paraAccount, paraWallet, handleParaTransaction, sendTransaction]
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

    // For Para wallets, ensure we're actually using the Para connector
    if (
      isPara &&
      wagmiAccount.connector?.id !== 'para' &&
      wagmiAccount.connector?.id !== 'getpara'
    ) {
      console.log(
        'Para wallet detected but using wrong connector:',
        wagmiAccount.connector?.id,
        '- switching to Para connector'
      );

      // Para connector is no longer needed with decoupled architecture
      // The wallet manager handles this automatically
      console.log('Para connector logic skipped - handled by wallet manager');
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

    // For Para wallets, always use USDC on Base regardless of selectedToken/selectedChainId
    const tokenToUse = isPara ? 'USDC' : selectedToken;
    const chainIdToUse = isPara ? 8453 : selectedChainId;

    // Debug: Log the actual connector being used for transaction
    console.log('Transaction debug:', {
      isPara,
      tokenToUse,
      chainIdToUse,
      currentConnector: wagmiAccount.connector?.id,
      expectedConnector: isPara ? 'para' : 'any',
      primaryConnectorId,
      isParaConnected,
    });

    // Use internal form submission
    handleFormSubmit(recipient.trim(), amount, tokenToUse, chainIdToUse);
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
                          {isPara ? 'USDC' : selectedToken}
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
                        selectedToken={isPara ? 'USDC' : selectedToken}
                        onTokenChange={handleTokenChange}
                        chainId={isPara ? 8453 : selectedChainId}
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
                        selectedChainId={isPara ? 8453 : selectedChainId}
                        onNetworkChange={handleNetworkChange}
                        isPara={isPara}
                        selectedToken={isPara ? 'USDC' : selectedToken}
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
                    {/* <div className="bg-white border border-[#c7c7d0] rounded-[2px] px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const connectorIcon = isPara
                            ? '/images/paraLogo.png'
                            : wagmiAccount.connector?.icon ||
                              '/images/icons/injected.png';

                          return (
                            <img
                              src={connectorIcon}
                              alt="wallet"
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          );
                        })()}
                        <span className="text-[#353548] text-base font-normal">
                          {isPara ? 'Embedded Wallet' : 'External Wallet'}
                        </span>
                      </div>
                      <ChevronDown className="w-5 h-5 text-[#353548]" />
                    </div> */}
                    {/* Connection Status */}
                    <div className="bg-[#3a365e] border border-[#f6b613] rounded-[2px] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-base font-semibold">
                          Connected to:
                        </span>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const connectorIcon = isPara
                              ? '/images/paraLogo.png'
                              : wagmiAccount.connector?.icon ||
                                '/images/icons/injected.png';

                            return (
                              <img
                                src={connectorIcon}
                                alt="wallet"
                                className="w-5 h-5 rounded object-cover"
                              />
                            );
                          })()}
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
                    {/* <button className="text-[#1b6fae] text-sm font-medium">
                      SWITCH WALLET (2)
                    </button> */}
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
                        {getTokenInfo(
                          isPara ? 'USDC' : selectedToken,
                          isPara ? 8453 : selectedChainId
                        )?.symbol || (isPara ? 'USDC' : selectedToken)}
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
                        {getTokenInfo(
                          isPara ? 'USDC' : selectedToken,
                          isPara ? 8453 : selectedChainId
                        )?.symbol || (isPara ? 'USDC' : selectedToken)}
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
            token={paymentData.token || (isPara ? 'USDC' : selectedToken)}
            chainId={paymentData.chainId || (isPara ? 8453 : selectedChainId)}
            connectedAddress={connectedAddress || undefined}
            txHash={txHash || undefined}
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
