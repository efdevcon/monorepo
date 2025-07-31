'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useZupass } from '@/context/ZupassProvider';
import { toast } from 'sonner';
import { Ticket } from '@/context/ZupassProvider';

interface LinkTicketProps {
  className?: string;
}

export default function LinkTicket({ className }: LinkTicketProps) {
  const { loading, publicKey, Connect, GetTicket, zupassLoaded } = useZupass();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const loadTicket = async () => {
      if (publicKey) {
        try {
          const ticketData = await GetTicket();
          if (ticketData) {
            setTicket(ticketData);
          }
        } catch (error) {
          console.error('Failed to load ticket:', error);
        }
      }
    };

    loadTicket();
  }, [publicKey, GetTicket]);

  const handleLinkTicket = async () => {
    if (!zupassLoaded) {
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            ℹ️ Using Fallback Mode
          </div>
          <div className="text-sm text-blue-700">
            Zupass modules are not available. Connecting in fallback mode with simulated data.
          </div>
        </div>,
        {
          duration: 3000,
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
      // Continue with fallback mode instead of returning
    }

    if (publicKey) {
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            ℹ️ Already Connected
          </div>
          <div className="text-sm text-blue-700">
            Your Zupass is already connected. You can view your ticket in the dashboard.
          </div>
        </div>,
        {
          duration: 3000,
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
      return;
    }

    setIsConnecting(true);
    try {
      await Connect(true); // onboard = true to import ticket data
    } catch (error) {
      console.error('Failed to link ticket:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUnlinkTicket = async () => {
    setIsUnlinking(true);
    try {
      // Clear local storage
      localStorage.removeItem('zupassPublicKey');
      localStorage.removeItem('zupassTicket');
      localStorage.removeItem('zupassSwag');
      localStorage.removeItem('zupassCollectibles');
      
      // Reset ticket state
      setTicket(null);
      
      // Force page reload to reset the context
      window.location.reload();
      
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">
            ✅ Ticket Unlinked Successfully
          </div>
          <div className="text-sm text-green-700">
            Your Zupass connection has been removed and ticket data cleared.
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } catch (error) {
      console.error('Failed to unlink ticket:', error);
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">❌ Failed to Unlink Ticket</div>
          <div className="text-sm text-red-700">
            <div className="font-medium">Error:</div>
            <div className="bg-red-50 p-2 rounded border text-red-600">
              {error instanceof Error ? error.message : 'Unknown error'}
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
      setIsUnlinking(false);
    }
  };

  if (publicKey && ticket) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className || ''}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-green-800">🎫 Ticket Connected</h3>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
            {ticket.isConsumed ? 'Used' : 'Active'}
          </span>
        </div>
        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{ticket.ticketType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Attendee:</span>
            <span className="font-medium">{ticket.attendeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium text-xs">{ticket.attendeeEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket ID:</span>
            <span className="font-mono text-xs">{ticket.ticketId}</span>
          </div>
        </div>
        <Button
          onClick={handleUnlinkTicket}
          variant="outline"
          size="sm"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          disabled={isUnlinking}
        >
          {isUnlinking ? 'Unlinking...' : 'Unlink Ticket'}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleLinkTicket}
      className={`w-full ${className || ''}`}
      size="lg"
      disabled={loading || isConnecting}
    >
      {!zupassLoaded 
        ? 'Link Ticket (Fallback)'
        : loading || isConnecting 
          ? 'Linking Ticket...' 
          : 'Link Ticket'
      }
    </Button>
  );
} 
