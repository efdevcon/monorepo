'use client';

import { internalDebuging } from '@/utils/auth';
import { useAccount as useParaAccount } from '@getpara/react-sdk';
import React from 'react';

interface ProgressSectionProps {
  progress: { completed: number; total: number; percentage: number };
  onViewStampbook: () => void;
  onReset?: () => void;
}

const ProgressSection = React.forwardRef<HTMLDivElement, ProgressSectionProps>(
  ({ progress, onViewStampbook, onReset }, ref) => {
    // Get Para account to check for internal debugging access
    const paraAccount = useParaAccount();
    const paraEmail = (paraAccount as any)?.embedded?.email || null;

    return (
      <>
        {/* Progress Section */}
        <div
          ref={ref}
          className="w-full bg-white border-t border-[#eeeeee] p-6"
        >
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#20202b] tracking-[-0.1px] leading-none">
              Progress
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between w-full text-sm">
                <p
                  className="font-medium text-[#353548] tracking-[-0.1px] leading-none"
                  style={{ fontFamily: 'Roboto Mono, monospace' }}
                >
                  {progress.completed}/{progress.total} completed
                </p>
                <button
                  type="button"
                  onClick={onViewStampbook}
                  className="font-semibold text-[#0073de] hover:underline cursor-pointer whitespace-nowrap"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  View Stampbook
                </button>
              </div>
              <div className="w-full h-[6px] bg-[#eaf4fb] overflow-hidden">
                <div
                  className="h-full bg-[#1b6fae]"
                  style={{
                    width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Debug Reset Button */}
        {onReset && internalDebuging(paraEmail) && (
          <div className="w-full px-4 pb-4 bg-white">
            <button
              onClick={onReset}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-[#36364c] font-medium hover:bg-gray-50 hover:border-[#d0d0d0] transition-colors"
            >
              Debug: Reset All Progress
            </button>
          </div>
        )}
      </>
    );
  }
);

ProgressSection.displayName = 'ProgressSection';

export default ProgressSection;

