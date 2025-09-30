'use client';

import { Button } from '@/components/ui/button';
import { useNetworkSwitcher } from '@/hooks/useNetworkSwitcher';
import { getNetworkConfig, getReadableNetworkName } from '@/config/networks';
import NetworkLogo from './NetworkLogo';
import { useState } from 'react';
import NetworkModal from './NetworkModal';

interface NetworkSwitcherProps {
  className?: string;
  size?: 'sm' | 'lg';
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'destructive'
    | 'ghost'
    | 'link';
  showAsModal?: boolean;
}

export default function NetworkSwitcher({
  className = '',
  size = 'lg',
  variant = 'outline',
  showAsModal = false,
}: NetworkSwitcherProps) {
  const {
    currentChainId,
    isConnected,
    isPending,
    error,
    switchToNetwork,
    isSwitchingTo,
    chains,
    getCurrentNetwork,
  } = useNetworkSwitcher();

  const [showModal, setShowModal] = useState(false);

  if (!isConnected) {
    return (
      <div className={`space-y-2 ${className}`}>
        <h3 className="text-sm font-medium text-gray-700">Network Switcher</h3>
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
          Connect your wallet to switch networks
        </div>
      </div>
    );
  }

  // If showAsModal is true, show a button that opens the modal
  if (showAsModal) {
    return (
      <>
        <div className={`space-y-2 ${className}`}>
          <h3 className="text-sm font-medium text-gray-700">Switch Network</h3>
          <Button
            onClick={() => setShowModal(true)}
            className="w-full cursor-pointer transition-all duration-200 hover:bg-gray-50"
            size={size}
            variant={variant}
          >
            <div className="flex items-center space-x-2">
              <NetworkLogo chainId={currentChainId} size="sm" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {getCurrentNetwork().name}
                </span>
              </div>
            </div>
          </Button>
        </div>

        <NetworkModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Original grid layout
  return (
    <div className={`space-y-2 ${className} pb-4`}>
      <h3 className="text-sm font-medium text-gray-700">Switch Network</h3>
      <div className="grid grid-cols-2 gap-2">
        {chains.map((chain) => {
          const config = getNetworkConfig(chain.id);
          const isCurrentChain = chain.id === currentChainId;
          const isSwitching = isSwitchingTo(chain.id);

          return (
            <Button
              key={chain.id}
              onClick={() => switchToNetwork(chain.id)}
              disabled={isSwitching || isCurrentChain}
              className={`w-full cursor-pointer transition-all duration-200 ${
                isCurrentChain
                  ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                  : 'hover:bg-gray-50'
              }`}
              size={size}
              variant={isCurrentChain ? 'default' : variant}
            >
              <div className="flex items-center space-x-2">
                <NetworkLogo chainId={chain.id} size="sm" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {getReadableNetworkName(config.name)}
                  </span>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
