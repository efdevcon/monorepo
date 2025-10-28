'use client';

import React from 'react';
import { X } from 'lucide-react';

// Image assets from Figma design
const logo = "https://storage.googleapis.com/zapper-fi-assets/apps%2Faave-v3.png";
const imgAwardStar = "/images/icons/award-star.svg";
const linkArrow = "/images/icons/link-arrow.svg";
const x = "/images/icons/x.svg";
const farcaster = "/images/icons/farcaster.svg";

interface SupporterInfoProps {
  onClose: () => void;
  onBack: () => void;
  hideBackButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
  supporterName?: string;
  supporterDescription?: string;
  supporterLogo?: string;
  category?: string;
}

export const SupporterInfo: React.FC<SupporterInfoProps> = ({ 
  onClose, 
  onBack, 
  hideBackButton = false,
  buttonText = "View Quest",
  onButtonClick,
  supporterName = "Aave",
  supporterDescription = "Aave is a decentralized lending platform that allows users to lend and borrow cryptocurrencies.",
  supporterLogo,
  category = "AI"
}) => {
  return (
    <div 
      className="box-border content-stretch flex flex-col gap-4 items-start pb-3 pt-5 px-5 relative size-full"
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.70)',
        background:
          'linear-gradient(0deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.70) 100%), linear-gradient(0deg, #AAA7FF 0%, #F6B40E 100%)',
        boxShadow: '0 -2px 4px 0 rgba(54, 54, 76, 0.10)',
      }}
    >
      {/* Header with back button and close button */}
      <div className={`flex items-center w-full ${hideBackButton ? 'justify-end' : 'justify-between'}`}>
        {/* Back button - only show if not hidden */}
        {!hideBackButton && (
          <button
            onClick={(e) => {
              console.log('Back button clicked');
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            onTouchEnd={(e) => {
              console.log('Back button touched');
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            className="flex gap-1 items-center hover:opacity-80 transition-opacity"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="#36364c"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-sm font-semibold text-[#36364c]">Back</div>
          </button>
        )}

        {/* Close button */}
        <button
          onClick={(e) => {
            console.log('Close button clicked');
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          onTouchEnd={(e) => {
            console.log('Close button touched');
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <X className="w-4 h-4 text-[#36364c]" />
        </button>
      </div>

      {/* Main content container */}
      <div className="content-stretch flex flex-col gap-4 items-start relative shrink-0 w-full">
        {/* Header section with logo and info */}
        <div className="content-stretch flex gap-3 items-start relative shrink-0 w-full">
          <div className="basis-0 content-stretch flex gap-3 grow items-center min-h-px min-w-px relative shrink-0">
            {/* Logo */}
            <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
              <div className="[grid-area:1_/_1] bg-center bg-cover bg-no-repeat ml-0 mt-0 size-11 bg-gray-200 rounded">
                {supporterLogo ? (
                  <img
                    src={supporterLogo}
                    alt={supporterName}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div 
                    className="w-full h-full bg-center bg-cover bg-no-repeat rounded" 
                    style={{ backgroundImage: `url('${logo}')` }} 
                  />
                )}
              </div>
            </div>
            
            {/* Title and category info */}
            <div className="basis-0 content-stretch flex flex-col gap-1.5 grow items-start justify-center min-h-px min-w-px relative shrink-0">
              <div className="content-stretch flex gap-1.5 items-center relative shrink-0 w-full">
                <div className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-[#20202b] text-xl text-nowrap">
                  <p className="leading-none whitespace-pre">{supporterName}</p>
                </div>
                <div className="box-border content-stretch flex gap-1 items-center px-1 py-px relative shrink-0">
                  <div aria-hidden="true" className="absolute border border-[#4b4b66] border-solid inset-0 pointer-events-none" />
                  <div className="font-['Roboto:SemiBold',_sans-serif] font-semibold leading-[0] relative shrink-0 text-[#353548] text-[10px] text-nowrap tracking-[0.2px]">
                    <p className="leading-[1.3] whitespace-pre">{category}</p>
                  </div>
                </div>
              </div>
              
              {/* Quest available indicator */}
              <div className="content-stretch flex gap-1 items-center relative shrink-0">
                <div className="relative shrink-0 size-4">
                  <img alt="" className="block max-w-none size-full" src={imgAwardStar} />
                </div>
                <div className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#36364c] text-xs text-center text-nowrap tracking-[-0.1px]">
                  <p className="leading-none whitespace-pre">Quest available</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Quest button */}
        <button
          onClick={(e) => {
            console.log(`${buttonText} button clicked`);
            e.preventDefault();
            e.stopPropagation();
            if (onButtonClick) {
              onButtonClick();
            } else {
              onBack();
            }
          }}
          onTouchEnd={(e) => {
            console.log(`${buttonText} button touched`);
            e.preventDefault();
            e.stopPropagation();
            if (onButtonClick) {
              onButtonClick();
            } else {
              onBack();
            }
          }}
          className="bg-[#1b6fae] box-border content-stretch flex gap-2 items-center justify-center p-3 relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] shrink-0 w-full hover:bg-[#155a8a] transition-colors"
        >
          <div className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-sm text-center text-nowrap text-white">
            <p className="leading-none whitespace-pre">{buttonText}</p>
          </div>
          <div className="absolute inset-0 pointer-events-none shadow-[0px_2px_1px_0px_inset_#3898e0,0px_-1px_1px_0px_inset_#3898e0,0px_4px_8px_0px_inset_#3898e0,0px_-3px_6px_0px_inset_#3898e0]" />
        </button>

        {/* About section */}
        <div className="content-stretch flex flex-col gap-1 items-start leading-[0] relative shrink-0 text-[#20202b] tracking-[-0.1px] w-full">
          <div className="font-['Roboto:Bold',_sans-serif] font-bold relative shrink-0 text-base w-full">
            <p className="leading-[1.5]">About</p>
          </div>
          <div className="font-['Roboto:Regular',_sans-serif] font-normal relative shrink-0 text-sm w-full">
            <p className="leading-[1.5]">{supporterDescription}</p>
          </div>
        </div>

        {/* Links section */}
        <div className="content-stretch flex flex-col gap-1 items-start relative shrink-0 w-full">
          <div className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] min-w-full relative shrink-0 text-[#20202b] text-base tracking-[-0.1px]">
            <p className="leading-[1.5]">Links</p>
          </div>
          <div className="content-stretch flex gap-2 items-start relative shrink-0">
            {/* Visit Website button */}
            <div className="bg-white box-border content-stretch flex gap-2 h-10 items-center justify-center px-4 py-2 relative shrink-0">
              <div aria-hidden="true" className="absolute border border-[#ededf0] border-solid inset-0 pointer-events-none" />
              <div className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-[#353548] text-sm text-center text-nowrap">
                <p className="leading-none whitespace-pre">Visit Website</p>
              </div>
              <div className="overflow-clip relative shrink-0 size-4">
                <div className="absolute bottom-[20.83%] left-[20.84%] right-[24.99%] top-1/4">
                  <img alt="" className="block max-w-none size-full" src={linkArrow} />
                </div>
              </div>
            </div>
            
            {/* Social media buttons */}
            <div className="bg-white box-border content-stretch flex gap-2 items-center justify-center p-2 relative shrink-0 size-10">
              <div aria-hidden="true" className="absolute border border-[#ededf0] border-solid inset-0 pointer-events-none" />
              <div className="overflow-clip relative shrink-0 size-4">
                <div className="absolute bottom-[3.18%] left-0 right-0 top-[6.46%]">
                  <img alt="" className="block max-w-none size-full" src={x} />
                </div>
              </div>
            </div>
            
            <div className="bg-white box-border content-stretch flex gap-2 items-center justify-center p-2 relative shrink-0 size-10">
              <div aria-hidden="true" className="absolute border border-[#ededf0] border-solid inset-0 pointer-events-none" />
              <div className="relative shrink-0 size-4">
                <div className="absolute bottom-[5.56%] left-0 right-0 top-[2.78%]">
                  <img alt="" className="block max-w-none size-full" src={farcaster} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
