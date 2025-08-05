'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, DollarSign } from 'lucide-react';

interface AmountStepProps {
  onNext: (amount: string) => void;
  onBack: () => void;
  initialValue?: string;
}

export default function AmountStep({ onNext, onBack, initialValue = '0.01' }: AmountStepProps) {
  const [amount, setAmount] = useState(initialValue);
  const [isValid, setIsValid] = useState(true);

  const validateAmount = (value: string) => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 0 && numValue <= 1000; // Max 1000 USDC
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setIsValid(validateAmount(value));
  };

  const handleNext = () => {
    if (!isValid) {
      return;
    }
    onNext(amount);
  };

  const quickAmounts = ['0.01', '0.1', '1', '10', '100'];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Amount to Send</h2>
        <p className="text-sm text-gray-600">
          Enter the amount of USDC you want to send
        </p>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
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
        <div>
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

        {/* Validation Message */}
        {amount && !isValid && (
          <p className="text-sm text-red-600">
            Please enter a valid amount between 0.01 and 1000 USDC
          </p>
        )}

        {isValid && amount && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ Amount: {amount} USDC
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValid || !amount}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
} 
