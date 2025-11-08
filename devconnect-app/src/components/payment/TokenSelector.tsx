'use client';

import { tokens, getTokenInfo } from '@/config/tokens';
import { useDropdownManager } from './useDropdownManager';

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
  const { isOpen, toggleDropdown, dropdownRef } =
    useDropdownManager('token-selector');

  // Show all available tokens - network will adapt to support the selected token
  const availableTokens = isPara
    ? [tokens.USDC] // Para wallets only support USDC
    : Object.values(tokens); // All tokens for other wallets

  const selectedTokenInfo = getTokenInfo(selectedToken, chainId);

  // For Para wallets with only one token, don't allow opening dropdown
  const canToggle = !(isPara && availableTokens.length === 1);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={canToggle ? toggleDropdown : undefined}
        className={`w-full bg-white border rounded-[2px] px-[16px] py-[12px] flex items-center justify-between transition-colors ${
          isOpen
            ? 'border-[#c7c7d0] bg-white'
            : 'border-[#ededf0] hover:bg-[#eaf4fb] hover:border-[#c7c7d0]'
        }`}
      >
        <div className="flex items-center gap-[12px]">
          {selectedTokenInfo?.logoUrl && (
            <img
              src={selectedTokenInfo.logoUrl}
              alt={selectedTokenInfo.symbol}
              className="w-[20px] h-[20px]"
            />
          )}
          <span className="text-[#353548] text-[16px] font-normal tracking-[-0.1px] leading-none">
            {selectedTokenInfo?.symbol || selectedToken}
          </span>
        </div>
        {canToggle && (
          <svg
            className={`w-[20px] h-[20px] text-[#0073de] transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[2px] shadow-[0px_2px_4px_0px_rgba(54,54,76,0.2)] px-[4px] py-[8px] z-10 flex flex-col gap-[4px]">
          {/* Category header */}
          <div className="px-[12px] py-[4px]">
            <p className="text-[#4b4b66] text-[12px] font-medium leading-none">
              Select a payment method
            </p>
          </div>

          {/* Token options */}
          {availableTokens.map((token) => {
            // Get token info from any supported network for display purposes
            const supportedNetworks = Object.entries(token.addresses || {})
              .filter(([_, address]) => address)
              .map(([chainId, _]) => parseInt(chainId));

            const tokenInfo =
              supportedNetworks.length > 0
                ? getTokenInfo(token.symbol, supportedNetworks[0])
                : { symbol: token.symbol, name: token.name, logoUrl: null };

            const isSelected = token.symbol === selectedToken;

            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => {
                  onTokenChange(token.symbol);
                  toggleDropdown();
                }}
                className={`w-full px-[12px] py-[6px] flex items-center gap-[12px] transition-colors text-left ${
                  isSelected ? 'bg-[#eaf4fb]' : 'bg-white hover:bg-[#eaf4fb]'
                }`}
              >
                <div className="flex-1 flex items-center gap-[12px]">
                  {tokenInfo?.logoUrl && (
                    <img
                      src={tokenInfo.logoUrl}
                      alt={tokenInfo.symbol}
                      className="w-[20px] h-[20px]"
                    />
                  )}
                  <span className="text-[#353548] text-[16px] font-normal tracking-[-0.1px] leading-none">
                    {token.symbol}
                  </span>
                </div>
                {isSelected && (
                  <svg
                    className="w-[16px] h-[16px] text-[#0073de] flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
