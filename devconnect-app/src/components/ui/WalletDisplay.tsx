"use client";

import { useAppKitAccount, useAppKitNetwork, useDisconnect } from "@reown/appkit/react";
import { useBalance } from "wagmi";
import { formatAddress, formatBalance } from "@/utils/format";

export function WalletDisplay() {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({
    address: address as `0x${string}` | undefined,
  });

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Wallet Information</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Address</label>
          <p className="font-mono text-sm mt-1">{formatAddress(address)}</p>
        </div>
        
        <div>
          <label className="text-sm text-gray-600">Network</label>
          <p className="text-sm mt-1">{caipNetwork?.name || "Unknown"}</p>
        </div>
        
        <div>
          <label className="text-sm text-gray-600">Balance</label>
          <p className="text-sm mt-1">
            {balanceData ? formatBalance(balanceData.formatted) : "0"} {balanceData?.symbol}
          </p>
        </div>
      </div>
      
      <button
        onClick={() => disconnect()}
        className="w-full mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
} 
