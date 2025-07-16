import React from 'react';

export default function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <rect
        x="3"
        y="7"
        width="18"
        height="10"
        rx="3"
        stroke={active ? '#2563eb' : '#888'}
        strokeWidth="2"
        fill={active ? '#dbeafe' : 'none'}
      />
      <circle
        cx="17"
        cy="12"
        r="1.5"
        fill={active ? '#2563eb' : '#888'}
      />
    </svg>
  );
} 
