'use client';

import { useNetworkSwitcher } from '@/hooks/useNetworkSwitcher';
import { getNetworkConfig, chains } from '@/config/networks';
import NetworkLogo from './NetworkLogo';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NetworkModal({ isOpen, onClose }: NetworkModalProps) {
  const { currentChainId, switchToNetwork } = useNetworkSwitcher();

  if (!isOpen) return null;

  const handleNetworkSwitch = async (chainId: number) => {
    if (chainId !== currentChainId) {
      await switchToNetwork(chainId);
    }
    onClose();
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 opacity-0"></div>
            <h2 className="text-base font-semibold text-[#36364c] tracking-[-0.1px]">
              Select a network
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-4 pb-8 pt-4">
          <h3 className="text-lg font-bold text-[#242436] mb-4 tracking-[-0.1px]">
            Available networks
          </h3>
          <div className="space-y-0">
            {chains.map((chain) => {
              const config = getNetworkConfig(chain.id);
              const isCurrentChain = chain.id === currentChainId;
              
              return (
                <button
                  key={chain.id}
                  onClick={() => handleNetworkSwitch(chain.id)}
                  className={`w-full flex items-center gap-4 p-2 transition-colors ${
                    isCurrentChain 
                      ? 'bg-[#eaf4fb]' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <NetworkLogo chainId={chain.id} size="sm" />
                  <span className={`text-base font-medium tracking-[-0.1px] ${
                    isCurrentChain ? 'text-[#36364c] font-bold' : 'text-[#36364c] font-normal'
                  }`}>
                    {config.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
