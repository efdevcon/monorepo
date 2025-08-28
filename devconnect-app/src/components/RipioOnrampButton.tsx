'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface RipioOnrampButtonProps {
  address: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  children?: React.ReactNode;
}

// Configuration - widget URL only (token generation handled by backend)
const RIPIO_CONFIG = {
  widgetUrl: process.env.RIPIO_ENV === 'production'
    ? 'https://b2b-widget-onramp.ripio.com'
    : 'https://b2b-widget-onramp.sandbox.ripio.com'
};

export default function RipioOnrampButton({
  address,
  className,
  size = 'lg',
  variant = 'outline',
  children
}: RipioOnrampButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const generateAuthToken = async (externalRef: string): Promise<string> => {
    const response = await fetch('/api/ripio/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ externalRef }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token generation failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('Invalid token response from server');
    }

    return data.access_token;
  };

  const handleOpenRipioOnramp = async () => {
    if (!address) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ⚠️ No Address Available
          </div>
          <div className="text-sm text-red-700">
            Please ensure your wallet is properly connected before using Ripio onramp.
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      return;
    }

    setIsLoading(true);

    try {
      // Generate a unique external reference for this session
      const externalRef = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate authentication token
      const authToken = await generateAuthToken(externalRef);

      // Build the Ripio widget URL with parameters
      const currentDomain = window.location.origin;
      const redirectUrl = `${currentDomain}/onramp?type=ripio&confirm=true`;
      
      const widgetUrl = new URL(RIPIO_CONFIG.widgetUrl);
      widgetUrl.searchParams.set('_to', authToken);
      widgetUrl.searchParams.set('_addr', address);
      widgetUrl.searchParams.set('_net', 'ETHEREUM');
      widgetUrl.searchParams.set('_amount', '1000'); // Default amount in ARS
      widgetUrl.searchParams.set('_crypto', 'USDT');
      widgetUrl.searchParams.set('_tracking_session', externalRef);

      console.log('Opening Ripio onramp:', widgetUrl.toString());

      // Open Ripio in a new window/tab
      window.open(widgetUrl.toString(), '_blank', 'noopener,noreferrer');

      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            🚀 Ripio Onramp Opened
          </div>
          <div className="text-sm text-blue-700">
            Ripio has been opened in a new tab. Complete your purchase to add
            funds to your wallet.
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } catch (error) {
      console.error('Failed to open Ripio onramp:', error);
      
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ Ripio Onramp Failed
          </div>
          <div className="text-sm text-red-700">
            <div className="font-medium">Error:</div>
            <div className="bg-red-50 p-2 rounded border text-red-600">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </div>
        </div>,
        {
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleOpenRipioOnramp}
      className={className}
      size={size}
      variant={variant}
      disabled={isLoading}
    >
      {isLoading ? '🔄 Loading...' : children || '🚀 Add Funds with Ripio'}
    </Button>
  );
}
