import React from 'react';

interface PinProps {
  x: number;
  y: number;
  label?: string;
  color?: string;
  size?: number;
}

export const Pin: React.FC<PinProps> = ({ 
  x, 
  y, 
  label, 
  color = '#FF0000',
  size = 20 
}) => {
  return (
    <div
      className="absolute pointer-events-none z-[1000] -translate-x-1/2 -translate-y-full"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <svg
        width={size}
        height={size * 1.5}
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
          fill={color}
        />
      </svg>
      {label && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
};