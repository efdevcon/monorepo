'use client';

import React from 'react';

const InfoCard: React.FC = () => {
  return (
    <div className="w-full p-4">
      <div className="bg-[#ededf0] rounded flex items-center gap-2 p-4">
        <div className="flex-1 flex flex-col gap-1 tracking-[-0.1px]">
          <p
            className="text-sm font-bold text-[#20202b] leading-none"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Using wallets to complete Quests
          </p>
          <p
            className="text-xs font-medium text-[#353548] leading-[1.3]"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            You can complete quests using any wallet and verify completion later
            by connecting it to the app.
          </p>
        </div>
        <div className="w-8 h-8 flex-shrink-0">
          <img
            src="/images/icons/lightbulb.svg"
            alt="Info"
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default InfoCard;

