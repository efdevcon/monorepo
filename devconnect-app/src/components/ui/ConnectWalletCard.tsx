"use client";

import { useAppKit } from "@reown/appkit/react";

interface ConnectWalletCardProps {
  onConnect?: () => void;
}

export function ConnectWalletCard({ onConnect }: ConnectWalletCardProps) {
  const { open } = useAppKit();

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    } else {
      open();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Connect your wallet to start using this application
          </p>
        </div>

        <button
          onClick={handleConnect}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );
} 
