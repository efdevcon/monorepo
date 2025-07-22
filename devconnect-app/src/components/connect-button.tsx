"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const paraConnector = connectors.find((connector) => connector.id === "para");
  
  const handleConnect = () => {
    if (paraConnector) {
      connect({ connector: paraConnector });
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
  };
  
  return (
    <div>
      {isConnected && address ? (
        <div>
          <p>Connected: {address}</p>
          <button onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={handleConnect}>
          Connect Wallet
        </button>
      )}
    </div>
  );
} 
 