"use client";

import { useAppKit } from '@reown/appkit/react';
import { formatAddress } from '@/utils/format';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export function Header() {
  const { open } = useAppKit();
  const { isConnected, address } = useUnifiedConnection();

  return (
    <header className="border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">Devconnect App</span>
          </div>

          <button
            onClick={() => open()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {isConnected && address ? formatAddress(address) : "Connect Wallet"}
          </button>
        </div>
      </div>
    </header>
  );
} 
