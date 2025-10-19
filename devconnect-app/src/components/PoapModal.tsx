'use client';

import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';

export interface PoapModalProps {
  isOpen: boolean;
  onClose: () => void;
  poapData: {
    name: string;
    image: string;
    description?: string;
    collected?: boolean;
    stampedDate?: string;
  };
}

export default function PoapModal({
  isOpen,
  onClose,
  poapData,
}: PoapModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: string | undefined) => {
    if (!date) return 'Not yet collected';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-[999999] px-5"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#c7c7d0] rounded-[4px] w-full max-w-[353px] flex flex-col items-center relative shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <Icon path={mdiClose} size={1} className="text-[#353548]" />
        </button>

        {/* POAP Image */}
        <div className="pt-4 pb-0">
          <div className="w-[200px] h-[200px] rounded-full overflow-hidden shadow-[0px_4px_12px_0px_rgba(0,0,0,0.2)]">
            <img
              src={poapData.image}
              alt={poapData.name}
              className={`w-full h-full object-cover ${
                poapData.collected ? '' : 'grayscale opacity-50'
              }`}
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.src =
                  'https://images.reactbricks.com/original/a77a7ed1-cb3e-4b3b-98d5-865a66629009.svg';
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-4 pb-4 pt-3 flex flex-col items-center">
          {/* Title Section */}
          <div className="w-full flex flex-col items-center mb-4">
            {/* Status Badge */}
            <div className="mb-2">
              <p
                className={`text-sm font-bold tracking-[0.1px] leading-none uppercase ${
                  poapData.collected ? 'text-[#137c59]' : 'text-[#4b4b66]'
                }`}
              >
                {poapData.collected ? 'COLLECTED' : 'NOT COLLECTED'}
              </p>
            </div>

            {/* Title */}
            <h3 className="text-[#20202b] text-lg font-bold text-center leading-[1.3] tracking-[-0.1px] w-full mb-2">
              {poapData.name}
            </h3>

            {/* Description */}
            {poapData.description && (
              <p className="text-[#353548] text-sm font-normal text-center leading-[1.3] tracking-[-0.1px] w-full">
                {poapData.description}
              </p>
            )}
          </div>

          {/* Stamped Date Section */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full h-[1px] bg-[#c7c7d0]" />
            <p className="text-[#4b4b66] text-xs font-normal leading-[1.3] tracking-[-0.1px]">
              <span className="font-bold">Stamped:</span>{' '}
              {formatDate(poapData.stampedDate)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

