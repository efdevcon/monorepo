'use client';

import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

// Image assets from local public/images directory
const imgCheckbox = "/images/imgCheckbox.png";
const imgSend = "/images/imgSend.svg";
const imgCallReceived = "/images/imgCallReceived.svg";
const imgSwapVert = "/images/imgSwapVert.svg";
const imgQrCodeScanner = "/images/imgQrCodeScanner.svg";
const imgGroup = "/images/imgGroup.svg";
const imgGroup1 = "/images/imgGroup1.svg";
const imgKeyboardArrowDown = "/images/imgKeyboardArrowDown.svg";
const imgIconContainer = "/images/imgIconContainer.png";
const imgImage105 = "/images/imgImage105.png";
const imgIconContainer1 = "/images/imgIconContainer1.png";
const imgImage106 = "/images/imgImage106.png";
const imgIconContainer2 = "/images/imgIconContainer2.png";
const imgImage107 = "/images/imgImage107.png";

export default function WalletTab() {
  const { open } = useAppKit();
  const router = useRouter();
  const { address } = useUnifiedConnection();

  const handleSendClick = () => {
    open({ view: 'WalletSend' });
  };

  const handleSwapClick = () => {
    open({
      view: 'Swap',
      arguments: {
        amount: '10',
        fromToken: 'USDC',
        toToken: 'ETH'
      }
    });
  };

  const handleScanClick = () => {
    router.push('/scan');
  };

  const handleReceiveClick = () => {
    open({ view: "Account" });
  };

  const handleDigitalClick = () => {
    router.push('/wallet/onramp');
  };

  return (
    <div className="bg-[#f6fafe] min-h-screen w-full">
      {/* Main Content */}
      <div className="px-6 pt-6 space-y-6">
        {/* Profile Section */}
        <div className="space-y-4">
          {/* Profile Info */}
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-[1px]">
              <img src={imgCheckbox} alt="checkbox" className="w-5 h-5" />
              <span className="text-[#242436] text-base font-normal">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </span>
              <img src={imgKeyboardArrowDown} alt="dropdown" className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-[#242436] text-[36px] font-bold tracking-[-0.1px]">$1337.54</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              <button 
                onClick={handleSendClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-6 w-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgSend} alt="send" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">Send</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <button 
                onClick={handleReceiveClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-6 w-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgCallReceived} alt="receive" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">Receive</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <button 
                onClick={handleSwapClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-6 w-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgSwapVert} alt="swap" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">Swap</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <button 
                onClick={handleScanClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-6 w-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgQrCodeScanner} alt="scan" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">Scan</span>
            </div>
          </div>
        </div>

        {/* Exchange Section */}
        <div className="bg-white border border-[#f0f0f4] rounded-[2px] p-5 space-y-5">
          <div className="space-y-2">
            <h2 className="text-[#242436] text-lg font-bold tracking-[-0.1px]">Exchange ARS/USD for Crypto</h2>
            <p className="text-[#36364c] text-sm font-normal">
              Fund your Ethereum wallet to fully experience the World's Fair. There are two ways to add funds to your wallet:
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <button 
                onClick={handleDigitalClick}
                className="flex-1 bg-gradient-to-b from-[#e9f4fc] to-[#d2e9f9] rounded-[2px] p-3 flex flex-col items-center gap-2 hover:from-[#d2e9f9] hover:to-[#b8dff0] transition-colors cursor-pointer"
              >
                <img src={imgGroup} alt="digital" className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-[#36364c] text-sm font-bold">Digital</div>
                  <div className="text-[#4b4b66] text-xs font-medium">Debit/Credit Card</div>
                </div>
              </button>
              <div className="flex-1 bg-gradient-to-b from-[#e9f4fc] to-[#d2e9f9] rounded-[2px] p-3 flex flex-col items-center gap-2">
                <img src={imgGroup1} alt="in-person" className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-[#36364c] text-sm font-bold">In-Person</div>
                  <div className="text-[#4b4b66] text-xs font-medium">Currency & Card</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="space-y-1">
          {/* Tabs */}
          <div className="bg-[#e5f1fb] p-1 rounded-[2px] flex gap-2">
            <div className="flex-1 bg-white shadow-[0px_1px_2px_0px_rgba(54,54,76,0.15)] rounded-[1px] px-3 py-1.5">
              <span className="text-[#165a8d] text-sm font-semibold">Assets</span>
            </div>
            <div className="flex-1 px-3 py-1.5 rounded-[2px]">
              <span className="text-[#4b4b66] text-sm font-semibold">Activity</span>
            </div>
          </div>

          {/* Assets Content */}
          <div className="bg-white border border-[#f0f0f4] rounded-[2px] p-5 space-y-6">
            <h3 className="text-[#242436] text-lg font-bold tracking-[-0.1px]">My Assets</h3>
            
            <div className="space-y-4">
              {/* Ethereum */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <img src={imgIconContainer} alt="ethereum" className="w-[41px] h-10" />
                    <img src={imgImage105} alt="eth" className="absolute -left-2 top-[22px] w-4 h-4 shadow-[0px_1px_2px_0px_rgba(54,54,76,0.25)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[#36364c] text-base font-bold">Ethereum</div>
                    <div className="text-[#4b4b66] text-sm font-normal">0.19 ETH</div>
                  </div>
                </div>
                <div className="text-[#242436] text-sm font-normal tracking-[-0.1px] w-[52px] text-right">
                  $892.50
                </div>
              </div>

              {/* USDC */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <img src={imgIconContainer1} alt="usdc" className="w-[41px] h-10" />
                    <img src={imgImage106} alt="usdc" className="absolute -left-2 top-[22px] w-4 h-4 rounded-full shadow-[0px_1px_2px_0px_rgba(54,54,76,0.25)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[#36364c] text-base font-bold">USDC</div>
                    <div className="text-[#4b4b66] text-sm font-normal">355.33 USDC</div>
                  </div>
                </div>
                <div className="text-[#242436] text-sm font-normal tracking-[-0.1px] w-[52px] text-right">
                  $355.33
                </div>
              </div>

              {/* Tether */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <img src={imgIconContainer2} alt="tether" className="w-[41px] h-10" />
                    <img src={imgImage107} alt="usdt" className="absolute -left-2 top-[22px] w-4 h-4 rounded-full shadow-[0px_1px_2px_0px_rgba(54,54,76,0.25)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[#36364c] text-base font-bold">Tether</div>
                    <div className="text-[#4b4b66] text-sm font-normal">89.47 USDT</div>
                  </div>
                </div>
                <div className="text-[#242436] text-sm font-normal tracking-[-0.1px] w-[52px] text-right">
                  $89.47
                </div>
              </div>
            </div>

            {/* View All Assets Button */}
            <div className="bg-[#eaf3fa] border border-white shadow-[0px_4px_0px_0px_#595978] rounded-[1px] px-6 py-3 flex items-center justify-center">
              <span className="text-[#36364c] text-base font-bold">View all Assets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
