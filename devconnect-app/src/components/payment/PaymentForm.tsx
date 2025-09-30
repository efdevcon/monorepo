'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, DollarSign, Send, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { base } from '@base-org/account';
import TokenSelector from './TokenSelector';
import NetworkSelector from './NetworkSelector';
import NetworkLogo from '../NetworkLogo';
import { getTokenInfo, getSupportedTokens, tokens } from '@/config/tokens';
import { getNetworkConfig } from '@/config/networks';

interface PaymentFormProps {
  onSendPayment: (
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
  initialRecipient?: string;
  initialAmount?: string;
  isPending?: boolean;
  showPreview?: boolean;
  isPara?: boolean;
  merchantName?: string;
  orderId?: string;
  connectedAddress?: string;
}

export default function PaymentForm({
  onSendPayment,
  onDirectSend,
  initialRecipient = '',
  initialAmount = '0.01',
  isPending = false,
  showPreview = true,
  isPara = false,
  merchantName = 'Devconnect',
  orderId,
  connectedAddress,
}: PaymentFormProps) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [isRecipientValid, setIsRecipientValid] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [isBasePayLoading, setIsBasePayLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [selectedChainId, setSelectedChainId] = useState(8453); // Base

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

  // Validate initial values on mount and when initial values change
  useEffect(() => {
    setIsRecipientValid(validateAddress(initialRecipient));
    setIsAmountValid(validateAmount(initialAmount));
  }, [initialRecipient, initialAmount]);

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

  const handleSendPayment = () => {
    if (!isRecipientValid) {
      toast.error('Please enter a valid 0x address');
      return;
    }
    if (!isAmountValid || !amount) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (onDirectSend && !showPreview) {
      onDirectSend(recipient.trim(), amount, selectedToken, selectedChainId);
    } else {
      onSendPayment(recipient.trim(), amount, selectedToken, selectedChainId);
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

  const quickAmounts = ['0.01', '0.1', '1', '10', '100'];
  const isFormValid = isRecipientValid && isAmountValid && amount;

  const selectedTokenInfo = getTokenInfo(selectedToken, selectedChainId);
  const selectedNetwork = getNetworkConfig(selectedChainId);

  return (
    <div className="space-y-6">
      {/* Merchant Information */}
      <div className="text-center space-y-2">
        <h2 className="text-[#20202b] text-base font-bold">{merchantName}</h2>
        {orderId && (
          <p className="text-[#353548] text-xs">
            <span className="font-bold">Order ID:</span> {orderId}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-end justify-center gap-1">
            <span className="text-[#4b4b66] text-xl">ARS</span>
            <span className="text-[#20202b] text-2xl font-bold">14,100</span>
          </div>
          <div className="flex items-end justify-center gap-1">
            <span className="text-[#4b4b66] text-base">USD</span>
            <span className="text-[#20202b] text-xl font-bold">{amount}</span>
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
        <h3 className="text-[#353548] text-base font-semibold">Network</h3>
        <NetworkSelector
          selectedChainId={selectedChainId}
          onNetworkChange={handleNetworkChange}
          isPara={isPara}
          selectedToken={selectedToken}
        />
        {isPara && (
          <p className="text-xs text-[#4b4b66] bg-gray-50 p-2 rounded">
            Network is automatically selected based on the chosen payment method
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
              <span className="font-normal">This transaction is gas-free</span>
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
            {amount} {selectedTokenInfo?.symbol || selectedToken}
          </span>
        </div>
      </div>

      {/* Pay Button */}
      <Button
        onClick={handleSendPayment}
        disabled={!isFormValid || isPending}
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
            Pay {merchantName} {amount}{' '}
            {selectedTokenInfo?.symbol || selectedToken}
          </>
        )}
      </Button>
    </div>
  );
} 
