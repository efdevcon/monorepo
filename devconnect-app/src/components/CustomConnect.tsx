'use client';

import { useAppKit } from '@reown/appkit/react';
import { useConnect } from 'wagmi';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

interface CustomConnectProps {
  onConnect?: () => void;
}

export default function CustomConnect({ onConnect }: CustomConnectProps) {
  const { open } = useAppKit();
  const { connect, connectors } = useConnect();
  const { setSkipped } = useUnifiedConnection();

  // Find the Para connector
  const paraConnector = connectors.find((connector) => connector.id === 'para');

  const handleWalletConnect = () => {
    // Use AppKit for wallet connections
    open();
    onConnect?.();
  };

  const handleEmailConnect = () => {
    // Use Para connector through wagmi for email authentication
    if (paraConnector) {
      connect({ connector: paraConnector });
      onConnect?.();
    }
  };

  const handleSkip = () => {
    console.log('handleSkip called');
    // Set skipped state to allow navigation without connection
    setSkipped(true);
    console.log('setSkipped(true) called');
    onConnect?.();
    console.log('onConnect callback called');
  };

  return (
    <div className="bg-white box-border flex flex-col gap-6 items-center justify-center pb-0 pt-6 px-6 relative rounded-[1px] w-full">
      {/* Main border with shadow */}
      <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

      <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
        {/* Header Container */}
        <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
          {/* Title Container */}
          <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
            <h1 className="font-['Roboto'] font-bold text-[#242436] text-[24px] text-left tracking-[-0.1px] w-full leading-[1.3]">
              Connect to start exploring
            </h1>

            {/* Connect Wallet Container */}
            <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
              <div className="flex flex-col gap-2 items-start justify-start text-[#242436] text-left w-full">
                <h2 className="font-['Roboto'] font-bold text-[16px] tracking-[-0.1px] w-full leading-[1.5]">
                  Connect using Ethereum
                </h2>
                <p className="font-['Roboto'] font-normal text-[14px] w-full leading-[1.3]">
                  Already onchain? Connect and set forth!
                </p>
              </div>

              {/* Wallet Connect Button */}
              <button
                onClick={handleWalletConnect}
                className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors"
              >
                <span className="font-['Roboto'] font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                  Connect with a wallet
                </span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative w-full">
            <div className="h-0 relative w-full">
              <div className="absolute bottom-[-0.5px] left-0 right-0 top-[-0.5px] border-t border-[#4b4b66] border-dashed"></div>
            </div>
            <div className="bg-[#e9f2fa] flex flex-col gap-2 items-center justify-center px-2 py-0 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="font-['Roboto'] font-normal text-[#4b4b66] text-[12px] text-center leading-none">
                OR
              </span>
            </div>
          </div>
        </div>

        {/* Connect Email Container */}
        <div className="flex flex-col gap-6 items-center justify-start p-0 relative w-full">
          <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
            <div className="flex flex-col gap-2 items-start justify-start text-[#242436] text-left w-full">
              <h3 className="font-['Roboto'] font-bold text-[16px] tracking-[-0.1px] w-full leading-[1.5]">
                New to Ethereum? Connect using Email
              </h3>
              <p className="font-['Roboto'] font-normal text-[14px] w-full leading-[1.3]">
                Quick start with email — we&apos;ll create a wallet for you
                behind the scenes.
              </p>
            </div>

            {/* Email Connect Button */}
            <button
              onClick={handleEmailConnect}
              className="bg-white flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_4px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors"
            >
              <span className="font-['Roboto'] font-bold text-[#36364c] text-[16px] text-center tracking-[-0.1px] leading-none">
                Connect with email
              </span>
            </button>
          </div>

          {/* Skip for now */}
          <button
            onClick={handleSkip}
            className="font-['Roboto'] font-bold text-[#1b6fae] text-[16px] text-center tracking-[-0.1px] w-full leading-none hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-row gap-2 items-center justify-center p-[24px] relative w-full border-t border-[#36364c]">
        <p className="font-['Roboto'] font-normal text-[12px] text-center leading-[1.4]">
          <span className="text-[#4b4b66]">
            By logging in, you agree to our{' '}
          </span>
          <span className="underline font-['Roboto'] font-bold text-[#1b6fae]">
            Terms and Conditions
          </span>
          <span className="text-[#4b4b66]"> and </span>
          <span className="underline font-['Roboto'] font-bold text-[#1b6fae]">
            Privacy Policy
          </span>
          <span className="text-[#4b4b66]">.</span>
        </p>
      </div>
    </div>
  );
} 
