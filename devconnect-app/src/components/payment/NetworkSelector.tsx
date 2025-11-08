'use client';

import {
  chains,
  getNetworkConfig,
  getReadableNetworkName,
} from '@/config/networks';
import { tokens } from '@/config/tokens';
import NetworkLogo from '../NetworkLogo';
import { useDropdownManager } from './useDropdownManager';

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
  const { isOpen, toggleDropdown, dropdownRef } =
    useDropdownManager('network-selector');

  // For Para wallets, only show Base and disable selection
  // For other wallets, filter networks based on selected token
  const availableNetworks = isPara
    ? [chains.find((chain) => chain.id === 8453)] // Base only
    : selectedToken
      ? chains.filter((chain) => {
          // Check if the selected token is supported on this network
          const tokenAddresses =
            tokens[selectedToken as keyof typeof tokens]?.addresses;
          if (!tokenAddresses) return false;

          // Check if token has network restrictions
          const token = tokens[selectedToken as keyof typeof tokens];
          if (
            'networks' in token &&
            token.networks &&
            Array.isArray(token.networks)
          ) {
            return token.networks.includes(chain.id as any);
          }

          // Check if token has an address on this network
          return tokenAddresses[chain.id] !== undefined;
        })
      : chains; // Show all networks if no token selected

  const selectedNetwork = getNetworkConfig(selectedChainId);

  // For Para wallets, don't allow opening dropdown (Base only)
  const canToggle = !isPara;

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
          <NetworkLogo chainId={selectedChainId} size="sm" />
          <span className="text-[#353548] text-[16px] font-normal tracking-[-0.1px] leading-none">
            {getReadableNetworkName(selectedNetwork.name)}
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
              Select a network
            </p>
          </div>

          {/* Network options */}
          {availableNetworks.filter(Boolean).map((network) => {
            if (!network) return null;
            const networkConfig = getNetworkConfig(network.id);
            const isSelected = network.id === selectedChainId;

            return (
              <button
                key={network.id}
                type="button"
                onClick={() => {
                  onNetworkChange(network.id);
                  toggleDropdown();
                }}
                className={`w-full px-[12px] py-[6px] flex items-center gap-[12px] transition-colors text-left ${
                  isSelected ? 'bg-[#eaf4fb]' : 'bg-white hover:bg-[#eaf4fb]'
                }`}
              >
                <div className="flex-1 flex items-center gap-[12px]">
                  <NetworkLogo chainId={network.id} size="sm" />
                  <span className="text-[#353548] text-[16px] font-normal tracking-[-0.1px] leading-none">
                    {getReadableNetworkName(networkConfig.name)}
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
