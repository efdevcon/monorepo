'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface RecipientStepProps {
  onNext: (recipient: string) => void;
  initialValue?: string;
}

export default function RecipientStep({ onNext, initialValue = '' }: RecipientStepProps) {
  const [recipient, setRecipient] = useState(initialValue);
  const [isValid, setIsValid] = useState(false);

  const validateAddress = (address: string) => {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address.trim());
  };

  const handleAddressChange = (value: string) => {
    setRecipient(value);
    setIsValid(validateAddress(value));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
      setIsValid(validateAddress(text));
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      toast.error('Failed to read from clipboard');
    }
  };

  const handleNext = () => {
    if (!isValid) {
      toast.error('Please enter a valid 0x address');
      return;
    }
    onNext(recipient.trim());
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Recipient Address</h2>
        <p className="text-sm text-gray-600">
          Enter the 0x address where you want to send USDC
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={recipient}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Enter 0x address..."
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

        {recipient && !isValid && (
          <p className="text-sm text-red-600">
            Please enter a valid 0x address (42 characters)
          </p>
        )}

        {isValid && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ Valid address: {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleNext}
          disabled={!isValid}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
} 
