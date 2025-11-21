'use client';
import { useAllStages } from '@/app/store.hooks';
import React from 'react';

function s() {
  const { pavilions } = useAllStages();

  const stageUrls = Object.values(pavilions).flatMap((stage) =>
    stage.map((s) => s.id)
  );

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '20px',
      }}
    >
      {stageUrls.map((url) => (
        <a
          key={url}
          href={`/s/${url}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {url}
          </button>
        </a>
      ))}
    </div>
  );
}

export default s;
