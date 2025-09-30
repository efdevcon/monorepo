'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { chains, getNetworkConfig, getReadableNetworkName } from '@/config/networks';
import { tokens } from '@/config/tokens';
import NetworkLogo from '../NetworkLogo';

interface NetworkSelectorProps {
  selectedChainId: number;
  onNetworkChange: (chainId: number) => void;
  isPara: boolean;
  selectedToken?: string;
}

export default function NetworkSelector({
  selectedChainId,
  onNetworkChange,
  isPara,
  selectedToken,
}: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // For Para wallets, only show Base and disable selection
  // For other wallets, filter networks based on selected token
  const availableNetworks = isPara 
    ? [chains.find(chain => chain.id === 8453)] // Base only
    : selectedToken 
      ? chains.filter(chain => {
          // Check if the selected token is supported on this network
          const tokenAddresses = tokens[selectedToken as keyof typeof tokens]?.addresses;
          if (!tokenAddresses) return false;
          
          // Check if token has network restrictions
          const token = tokens[selectedToken as keyof typeof tokens];
          if ('networks' in token && token.networks) {
            return token.networks.includes(chain.id as any);
          }
          
          // Check if token has an address on this network
          return tokenAddresses[chain.id] !== undefined;
        })
      : chains; // Show all networks if no token selected

  const selectedNetwork = getNetworkConfig(selectedChainId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !isPara && setIsOpen(!isOpen)}
        disabled={isPara}
        className={`w-full bg-white border border-[#c7c7d0] rounded-[2px] px-4 py-3 flex items-center justify-between transition-colors ${
          isPara ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <NetworkLogo chainId={selectedChainId} size="sm" />
          <span className="text-[#353548] text-base font-normal">
            {getReadableNetworkName(selectedNetwork.name)}
          </span>
        </div>
        <ChevronDown className="w-5 h-5 text-[#353548]" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#c7c7d0] rounded-[2px] shadow-lg z-10">
          {availableNetworks.filter(Boolean).map((network) => {
            if (!network) return null;
            const networkConfig = getNetworkConfig(network.id);
            return (
              <button
                key={network.id}
                type="button"
                onClick={() => {
                  onNetworkChange(network.id);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <NetworkLogo chainId={network.id} size="sm" />
                <span className="text-[#353548] text-base font-normal">
                  {getReadableNetworkName(networkConfig.name)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
