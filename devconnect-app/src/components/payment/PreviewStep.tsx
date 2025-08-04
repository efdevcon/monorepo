'use client';

import { Button } from '@/components/ui/button';
import { Shield, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';

interface PreviewStepProps {
  recipient: string;
  amount: string;
  isPara: boolean;
  connectedAddress?: string;
  onConfirm: () => void;
  onBack: () => void;
}

export default function PreviewStep({ 
  recipient, 
  amount, 
  isPara, 
  connectedAddress,
  onConfirm, 
  onBack 
}: PreviewStepProps) {
  const productUrl = 'https://www.pagar.simplefi.tech/6603276727aaa6386588474d/products/688ba8db51fc6c100f32cd63';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Review Payment</h2>
        <p className="text-sm text-gray-600">
          Please review your payment details before confirming
        </p>
      </div>

      {/* Payment Details */}
      <div className={`rounded-lg p-4 ${
        isPara 
          ? 'bg-purple-50 border border-purple-200' 
          : 'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {isPara ? (
            <Shield className="h-5 w-5 text-purple-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-blue-600" />
          )}
          <h3 className="font-semibold text-lg">
            {isPara ? 'Para Payment Details' : 'Payment Details'}
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="font-medium">{amount} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Network:</span>
            <span className="font-medium">Base</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">From:</span>
            <span className="font-medium font-mono text-xs">
              {connectedAddress ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">To:</span>
            <span className="font-medium font-mono text-xs">
              {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Method:</span>
            <span className="font-medium">
              {isPara ? 'Authorization' : 'Direct Transfer'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Wallet Type:</span>
            <span className="font-medium">
              {isPara ? 'Para Wallet' : 'Standard Wallet'}
            </span>
          </div>
        </div>

        {isPara && (
          <div className="mt-3 p-3 bg-purple-100 rounded text-xs">
            <div className="font-medium text-purple-800">Para Wallet Benefits:</div>
            <div className="text-purple-700 space-y-1 mt-1">
              <div>• No gas fees (sponsored by relayer)</div>
              <div>• Enhanced security with authorization</div>
              <div>• Instant transaction execution</div>
            </div>
          </div>
        )}
      </div>

      {/* Product Link */}
      <div className="bg-gradient-to-r from-green-200 to-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-lg">Product</h3>
        </div>
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
        >
          View Product Details
          <ExternalLink className="h-4 w-4" />
        </a>
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
          onClick={onConfirm}
          className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors ${
            isPara 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isPara ? 'Authorize & Send' : 'Send Payment'}
        </Button>
      </div>
    </div>
  );
} 
