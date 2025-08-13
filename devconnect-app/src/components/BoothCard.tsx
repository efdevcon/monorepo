import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Quest as ApiQuest } from '@/types';

interface BoothCardProps {
  quest: ApiQuest;
}

const BoothCard = ({ quest }: BoothCardProps) => {
  const [qrValue, setQrValue] = useState('');

  useEffect(() => {
    setQrValue(`${window.location.origin}/booth/${quest.boothCode}`);
  }, [quest.boothCode]);

  return (
    <div className="w-full bg-white rounded-lg shadow-md border border-[#dfdfeb] overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 bg-[#e8f3fb] border-b border-[#dfdfeb]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1b6fae] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{quest.order}</span>
            </div>
            <div>
              <h3 className="text-[#232336] font-semibold text-sm leading-tight">
                {quest.name}
              </h3>
              <p className="text-[#4b4b66] text-xs">
                {quest.category}
              </p>
            </div>
          </div>
          {/* <div className="text-right">
            <div className="text-[#f6b40e] font-bold text-sm">{quest.points}</div>
            <div className="text-[#4b4b66] text-xs">points</div>
          </div> */}
        </div>
      </div>

      {/* QR Code */}
      <div className="p-6 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border border-[#dfdfeb] mb-4">
          <a href={`/booth/${quest.boothCode}`} target="_blank" rel="noopener noreferrer">
            {qrValue && (
              <QRCodeSVG
                value={qrValue}
                size={128}
                level="M"
                includeMargin={true}
                className="w-32 h-32"
              />
            )}
          </a>
        </div>
        
        {/* Booth Code */}
        <div className="text-center">
          <p className="text-[#4b4b66] text-xs mb-1">Booth Code:</p>
          <button
            onClick={() => navigator.clipboard.writeText(quest.boothCode)}
            className="text-[#232336] font-mono text-sm bg-[#f5f5f9] px-3 py-1 rounded border hover:bg-[#e8f3fb] transition-colors cursor-pointer"
            title="Click to copy booth code"
          >
            {quest.boothCode}
          </button>
        </div>
      </div>

      {/* Footer */}
      {/* <div className="p-4 bg-[#f5f5f9] border-t border-[#dfdfeb]">
        <div className="flex items-center justify-between text-xs text-[#4b4b66]">
          <span>Difficulty: {quest.difficulty}</span>
          <span>Group: {quest.group}</span>
        </div>
      </div> */}
    </div>
  );
};

export default BoothCard;
