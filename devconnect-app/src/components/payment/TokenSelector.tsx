'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { tokens, getTokenInfo, getSupportedTokens } from '@/config/tokens';
import { getNetworkConfig } from '@/config/networks';

interface TokenSelectorProps {
  selectedToken: string;
  onTokenChange: (token: string) => void;
  chainId: number;
  isPara: boolean;
}

export default function TokenSelector({
  selectedToken,
  onTokenChange,
  chainId,
  isPara,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Show all available tokens - network will adapt to support the selected token
  const availableTokens = isPara 
    ? [tokens.USDC] // Para wallets only support USDC
    : Object.values(tokens); // All tokens for other wallets

  const selectedTokenInfo = getTokenInfo(selectedToken, chainId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#c7c7d0] rounded-[2px] px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {selectedTokenInfo?.logoUrl && (
            <img
              src={selectedTokenInfo.logoUrl}
              alt={selectedTokenInfo.symbol}
              className="w-5 h-5"
            />
          )}
          <span className="text-[#353548] text-base font-normal">
            {selectedTokenInfo?.symbol || selectedToken}
          </span>
        </div>
        <ChevronDown className="w-5 h-5 text-[#353548]" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#c7c7d0] rounded-[2px] shadow-lg z-10">
          {availableTokens.map((token) => {
            // Get token info from any supported network for display purposes
            const supportedNetworks = Object.entries(token.addresses || {})
              .filter(([_, address]) => address)
              .map(([chainId, _]) => parseInt(chainId));
            
            const tokenInfo = supportedNetworks.length > 0 
              ? getTokenInfo(token.symbol, supportedNetworks[0])
              : { symbol: token.symbol, name: token.name, logoUrl: null };
            
            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => {
                  onTokenChange(token.symbol);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                {tokenInfo?.logoUrl && (
                  <img
                    src={tokenInfo.logoUrl}
                    alt={tokenInfo.symbol}
                    className="w-5 h-5"
                  />
                )}
                <span className="text-[#353548] text-base font-normal">
                  {token.symbol}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
