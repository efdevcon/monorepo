'use client';

import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useState } from 'react';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null | undefined;
  identityName?: string | null;
}

export default function ReceiveModal({
  isOpen,
  onClose,
  address,
  identityName,
}: ReceiveModalProps) {
  const [addressCopied, setAddressCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
      toast.success('Address copied to clipboard', {
        description: address,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/33 flex items-end justify-center z-[999999]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[393px] rounded-t-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-3">
          <div className="w-6 h-6"></div>
          <h2 className="text-base font-semibold text-[#36364c] tracking-[-0.1px]">
            Receive
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 pb-8 pt-4 flex flex-col items-center">
          {/* Identity Name */}
          {identityName && (
            <div className="mb-4">
              <p className="text-lg font-bold text-[#242436] tracking-[-0.1px] text-center">
                {identityName}
              </p>
            </div>
          )}

          {/* QR Code */}
          {address && (
            <div className="bg-white p-4 rounded-lg border border-[#f0f0f4] mb-6">
              <QRCodeSVG
                value={address}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          )}

          {/* Address Display */}
          <div className="w-full space-y-3">
            <p className="text-sm font-medium text-[#36364c] text-center">
              Your wallet address
            </p>
            <div className="bg-[#f6fafe] border border-[#f0f0f4] rounded-[4px] p-4 flex items-center justify-between gap-3">
              <p className="text-sm font-mono text-[#242436] break-all flex-1">
                {address}
              </p>
              <button
                onClick={handleCopyAddress}
                className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                title={addressCopied ? 'Copied!' : 'Copy address'}
              >
                {addressCopied ? (
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-[#36364c]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyAddress}
            className="mt-6 w-full bg-[#165a8d] text-white px-6 py-3 rounded-[4px] font-semibold text-base hover:bg-[#0f4a73] transition-colors"
          >
            {addressCopied ? 'Copied!' : 'Copy Address'}
          </button>
        </div>
      </div>
    </div>
  );
}

