'use client';

import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getNetworkLogo } from '@/config/networks';
import { getTokenLogo } from '@/config/tokens';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null | undefined;
  identityName?: string | null;
  isPara?: boolean;
}

export default function ReceiveModal({
  isOpen,
  onClose,
  address,
  identityName,
  isPara = false,
}: ReceiveModalProps) {
  const [addressCopied, setAddressCopied] = useState(false);

  if (!isOpen) return null;

  // Portal requires document to exist (client-side only)
  if (typeof document === 'undefined') return null;

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

  return createPortal(
    <div
      className="fixed inset-0 bg-black/33 flex items-end justify-center"
      style={{ zIndex: 10000000 }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[393px] rounded-t-lg shadow-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-3 flex-shrink-0">
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
        <div className="px-4 pb-8 pt-4 flex flex-col items-center gap-8 w-full overflow-y-auto">
          {/* QR Code */}
          {address && (
            <div className="flex justify-center w-full">
              <QRCodeSVG
                value={address}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>
          )}

          {/* Wallet Info Container */}
          <div className="flex flex-col gap-4 w-full">
            {/* Wallet Address Card */}
            <div className="bg-white border border-[#e2e2e9] rounded-[4px] p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <p className="font-bold text-[#242436] text-[16px] leading-[1.3] tracking-[-0.1px]">
                  Your wallet address
                </p>
                <p className="font-mono text-[#36364c] text-[14px] leading-[1.3] break-all">
                  {address}
                </p>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyAddress}
                className="w-full bg-[#0073de] text-white px-6 py-3 rounded-[1px] font-bold text-[16px] shadow-[0px_4px_0px_0px_#005493] hover:bg-[#005493] transition-colors"
              >
                {addressCopied ? 'Copied!' : 'Copy address'}
              </button>
            </div>

            {/* Networks and Tokens Card */}
            <div className="bg-white border border-[#e2e2e9] rounded-[4px] p-4 flex flex-col gap-4">
              {/* Supported Networks */}
              <div className="flex flex-col gap-2">
                <p className="font-bold text-[#242436] text-[16px] leading-[1.3] tracking-[-0.1px]">
                  Supported networks
                </p>
                <div className="flex flex-wrap gap-3">
                  {isPara ? (
                    // Para: Only Base
                    <div className="flex items-center gap-1">
                      <img
                        src={getNetworkLogo(8453)}
                        alt="Base"
                        className="w-4 h-4"
                      />
                      <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                        Base
                      </span>
                    </div>
                  ) : (
                    // EOA: Multiple networks
                    <>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(8453)}
                          alt="Base"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          Base
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(1)}
                          alt="Ethereum"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          Ethereum
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(42161)}
                          alt="Arbitrum"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          Arbitrum
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(42220)}
                          alt="Celo"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          Celo
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(10)}
                          alt="Optimism"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          Optimism
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(137)}
                          alt="Polygon"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          Polygon
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getNetworkLogo(480)}
                          alt="World Chain"
                          className="w-4 h-4"
                        />
                        <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                          World Chain
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Supported Tokens - Only for Para */}
              {isPara && (
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-[#242436] text-[16px] leading-[1.3] tracking-[-0.1px]">
                    Supported tokens
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1">
                      <img
                        src={getTokenLogo('USDC', 8453)}
                        alt="USDC"
                        className="w-4 h-4"
                      />
                      <span className="text-[#242436] text-[14px] tracking-[-0.1px]">
                        USDC
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

