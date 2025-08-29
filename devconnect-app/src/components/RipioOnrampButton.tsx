'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

// Generate a valid UUID v4 (required by Ripio API)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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

  const handleOpenRipioOnramp = () => {
    if (!address) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ⚠️ No Address Available
          </div>
          <div className="text-sm text-red-700">
            Please ensure your wallet is properly connected before using Ripio
            onramp.
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

    // Open popup immediately with blank URL
    const popup = window.open('about:blank', '_blank', 'width=470,height=750');

    if (!popup) {
      console.error('Failed to open popup - popup blocked');
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">❌ Popup Blocked</div>
          <div className="text-sm text-red-700">
            Please allow popups for this site to use Ripio onramp.
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
      setIsLoading(false);
      return;
    }

    // Generate a unique external reference for this session (must be UUID v4 for Ripio API)
    const externalRef = generateUUID();

    // Generate authentication token using utility function
    generateAuthToken(externalRef)
      .then((authToken) => {
        if (!authToken) {
          throw new Error('Failed to generate authentication token');
        }

        // Build the Ripio widget URL with parameters (as per official docs) https://docs.ripio.com/widget/on-off-ramp
        const widgetUrl = new URL(RIPIO_CONFIG.widgetUrl);
        widgetUrl.searchParams.set('_to', authToken);
        widgetUrl.searchParams.set('_addr', address);
        widgetUrl.searchParams.set('_net', 'ETHEREUM_SEPOLIA');
        widgetUrl.searchParams.set('_amount', '2100'); // Default amount in ARS
        widgetUrl.searchParams.set('_crypto', 'RTEST');
        widgetUrl.searchParams.set('_tracking_session', externalRef);

        console.log('Opening Ripio onramp:', widgetUrl.toString());

        // Navigate popup to the actual URL
        popup.location.href = widgetUrl.toString();

        toast.info(
          <div className="space-y-2">
            <div className="font-semibold text-blue-800">
              🚀 Ripio Onramp Opened
            </div>
            <div className="text-sm text-blue-700">
              Ripio has been opened in a popup. Complete your purchase to add
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
      })
      .catch((error) => {
        console.error('Failed to open Ripio onramp:', error);

        // Show error message in popup
        if (popup && !popup.closed) {
          popup.document.write(`
            <html>
              <head>
                <title>Error</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: #f5f5f5;
                  }
                  .error-container {
                    text-align: center;
                    padding: 2rem;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  .error-title { color: #dc2626; margin-bottom: 1rem; }
                  .error-message { color: #6b7280; }
                </style>
              </head>
              <body>
                <div class="error-container">
                  <h2 class="error-title">Connection Error</h2>
                  <p class="error-message">Failed to connect to Ripio. Please try again or refresh the page.</p>
                </div>
              </body>
            </html>
          `);
        }

        toast.error(
          <div className="space-y-2">
            <div className="font-semibold text-red-800">
              ❌ Ripio Onramp Failed
            </div>
            <div className="text-sm text-red-700">
              <div className="font-medium">Error:</div>
              <div className="bg-red-50 p-2 rounded border text-red-600">
                {error instanceof Error
                  ? error.message
                  : 'Unknown error occurred'}
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
      })
      .finally(() => {
        setIsLoading(false);
      });
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
