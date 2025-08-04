'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, DollarSign, Send } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentFormProps {
  onSendPayment: (recipient: string, amount: string) => void;
  onDirectSend?: (recipient: string, amount: string) => void;
  initialRecipient?: string;
  initialAmount?: string;
  isPending?: boolean;
  showPreview?: boolean;
}

export default function PaymentForm({ 
  onSendPayment, 
  onDirectSend,
  initialRecipient = '', 
  initialAmount = '0.01',
  isPending = false,
  showPreview = true
}: PaymentFormProps) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [isRecipientValid, setIsRecipientValid] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(true);

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
      onDirectSend(recipient.trim(), amount);
    } else {
      onSendPayment(recipient.trim(), amount);
    }
  };

  const quickAmounts = ['0.01', '0.1', '1', '10', '100'];
  const isFormValid = isRecipientValid && isAmountValid && amount;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Send Payment</h2>
        <p className="text-sm text-gray-600">
          Enter the recipient address and amount to send USDC
        </p>
      </div>

      <div className="space-y-4">
        {/* Recipient Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              placeholder="Enter 0x address..."
              autoComplete="off"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              onClick={handlePaste}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Paste
            </Button>
          </div>
          {recipient && !isRecipientValid && (
            <p className="text-sm text-red-600 mt-1">
              Please enter a valid 0x address (42 characters)
            </p>
          )}
          {isRecipientValid && (
            <p className="text-sm text-green-600 mt-1">
              ✅ Valid address: {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Send
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.01"
              step="0.01"
              min="0.01"
              max="1000"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleAmountChange(quickAmount)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    amount === quickAmount
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {quickAmount} USDC
                </button>
              ))}
            </div>
          </div>

          {amount && !isAmountValid && (
            <p className="text-sm text-red-600 mt-1">
              Please enter a valid amount between 0.01 and 1000 USDC
            </p>
          )}
          {isAmountValid && amount && (
            <p className="text-sm text-green-600 mt-1">
              ✅ Amount: {amount} USDC
            </p>
          )}
        </div>
      </div>

      {/* Send Payment Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSendPayment}
          disabled={!isFormValid || isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 
