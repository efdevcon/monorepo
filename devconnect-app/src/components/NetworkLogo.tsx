'use client';

import { useState } from 'react';
import { getNetworkLogo } from '@/config/networks';

interface NetworkLogoProps {
  chainId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function NetworkLogo({ 
  chainId, 
  size = 'md', 
  className = ''
}: NetworkLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const zapperUrl = getNetworkLogo(chainId);

  // If no Zapper URL available, show nothing
  if (!zapperUrl) {
    return null;
  }

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (imageError) {
    return null;
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={zapperUrl}
        alt={`${chainId} network logo`}
        className={`${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          width: size === 'sm' ? '20px' : size === 'md' ? '24px' : '32px',
          height: size === 'sm' ? '20px' : size === 'md' ? '24px' : '32px',
        }}
      />
    </div>
  );
} 
