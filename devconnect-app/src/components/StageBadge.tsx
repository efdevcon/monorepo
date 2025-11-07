import React from 'react';
import cn from 'classnames';

type StageType = 'yellow' | 'green' | 'red' | 'music' | 'entertainment';

interface StageBadgeProps {
  type: StageType;
  label: string;
}

export const StageBadge: React.FC<StageBadgeProps> = ({ type, label }) => {
  const stageColors: Record<StageType, { bg: string; text?: string }> = {
    yellow: { bg: 'bg-[rgba(246,180,14,1)]' },
    green: { bg: 'bg-[rgba(56,142,48,1)]', text: 'text-white' },
    red: { bg: 'bg-[rgba(229,30,84,1)]', text: 'text-white' },
    music: { bg: 'bg-[rgba(23,71,149,1)]', text: 'text-white' },
    entertainment: { bg: 'bg-[rgba(232,131,1,1)]' },
  };

  const colors = stageColors[type];

  return (
    <div
      className={cn(
        'inline-block font-semibold p-1 text-sm px-3 rounded-xs mb-2 self-start',
        colors.bg,
        colors.text
      )}
    >
      {label}
    </div>
  );
};

