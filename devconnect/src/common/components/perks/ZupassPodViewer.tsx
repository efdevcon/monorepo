'use client';

import React, { useState, useEffect } from 'react';

interface PodTicket {
  attendeeName?: string;
  attendeeEmail?: string;
  eventName?: string;
  ticketName?: string;
  ticketSecret?: string;
  ticketId?: string;
  eventId?: string;
  productId?: string;
  timestampConsumed?: number;
  timestampSigned?: number;
  owner?: string;
  imageUrl?: string;
  eventStartDate?: string;
  eventLocation?: string;
  isAddOn?: boolean;
  isConsumed?: boolean;
  isRevoked?: boolean;
  ticketCategory?: number;
  [key: string]: any;
}

interface PodClaim {
  ticket?: PodTicket;
  signerPublicKey?: string;
  [key: string]: any;
}

interface PodProof {
  signature?: string;
  [key: string]: any;
}

interface PodData {
  id?: string;
  claim?: PodClaim;
  proof?: PodProof;
  type?: string;
  [key: string]: any;
}

interface ZupassPodViewerProps {
  podData?: PodData | string;
  className?: string;
}

const ZupassPodViewer: React.FC<ZupassPodViewerProps> = ({ podData, className = '' }) => {
  const [pod, setPod] = useState<PodData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('ZupassPodViewer mounted');
  }, []);

  useEffect(() => {
    if (podData) {
      try {
        // Handle both string and object inputs
        const parsedPod = typeof podData === 'string' ? JSON.parse(podData) : podData;
        setPod(parsedPod);
        setError(null);
      } catch (err) {
        setError(`Error parsing POD data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setPod(null);
      }
    } else {
      // Try to get POD from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const podParam = urlParams.get('pod');
      
      if (podParam) {
        try {
          // First try to parse as-is (in case it's already decoded)
          const parsedPod = JSON.parse(podParam);
          setPod(parsedPod);
          setError(null);
        } catch (e1) {
          try {
            // If that fails, try URL decoding first
            const parsedPod = JSON.parse(decodeURIComponent(podParam));
            setPod(parsedPod);
            setError(null);
          } catch (e2) {
            setError(`Error parsing POD data: ${e2 instanceof Error ? e2.message : 'Unknown error'}. The JSON must be properly URL-encoded.`);
            setPod(null);
          }
        }
      } else {
        setError('No POD data found. Please provide a POD object as a prop or URL parameter.');
      }
    }
  }, [podData]);

  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatBoolean = (value: boolean): JSX.Element => {
    return (
      <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
        value 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  };

  const formatField = (label: string, value: any, isId = false): JSX.Element => {
    let displayValue: React.ReactNode = value;
    
    if (typeof value === 'boolean') {
      displayValue = formatBoolean(value);
    } else if (typeof value === 'number' && label.toLowerCase().includes('timestamp')) {
      displayValue = formatTimestamp(value);
    } else if (isId) {
      displayValue = (
        <div className="font-mono text-sm bg-gray-50 p-2 rounded border border-gray-200 break-all">
          {value}
        </div>
      );
    } else if (label.toLowerCase().includes('image') && typeof value === 'string' && value) {
      // Handle image URLs
      let imageUrl = value;
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // If it's a relative URL, prepend the Zupass domain
        imageUrl = 'https://zupass.org' + imageUrl;
      }
      displayValue = (
        <div className="text-center my-5">
          <img 
            src={imageUrl} 
            alt={label} 
            className="max-w-full h-auto rounded-lg shadow-lg my-4" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="mt-2 text-sm text-gray-600">
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View full size
            </a>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex mb-3 items-start" key={label}>
        <div className="font-semibold text-gray-600 min-w-[200px] flex-shrink-0">
          {label}:
        </div>
        <div className="text-gray-800 break-all flex-1">
          {displayValue}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, data: Record<string, any>): JSX.Element | null => {
    if (!data || typeof data !== 'object') return null;
    
    const fields: JSX.Element[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const isId = key.toLowerCase().includes('id') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('signature');
      
      // Skip nested objects - they will be handled separately
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        continue;
      }
      
      fields.push(formatField(label, value, isId));
    }
    
    return (
      <div className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50" key={title}>
        <h2 className="text-xl font-semibold text-gray-800 mt-0 mb-4 pb-2 border-b-2 border-blue-500">
          {title}
        </h2>
        {fields}
      </div>
    );
  };

  const downloadPod = (): void => {
    if (!pod) {
      alert('No POD data found');
      return;
    }
    let filename = 'pod-data.json';
    if (typeof pod.id === 'string' && pod.id.length > 0) {
      filename = `pod-${pod.id.substring(0, 8)}.json`;
    }
    let podString = '';
    try {
      podString = JSON.stringify(pod, null, 2);
    } catch (err) {
      alert('Error serializing POD data: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return;
    }
    try {
      const blob = new Blob([podString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading POD: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const showExample = (): void => {
    const examplePod: PodData = {
      "id": "demo-pod-id-1234567890abcdef",
      "claim": {
        "ticket": {
          "attendeeName": "Demo User",
          "attendeeEmail": "demo.user@example.com",
          "eventName": "Devcon 7",
          "ticketName": "Demo Ticket",
          "ticketSecret": "demo-secret-1234",
          "ticketId": "demo-ticket-id-5678",
          "eventId": "5074edf5-f079-4099-b036-22223c0c6995",
          "productId": "08482abb-8767-47aa-be47-2691032403b6",
          "timestampConsumed": 1731295434188,
          "timestampSigned": 1750679115735,
          "owner": "demoOwnerPublicKey1234567890",
          "imageUrl": "/images/devcon/devcon-landscape.webp",
          "eventStartDate": "2024-11-09T08:00:00.000",
          "eventLocation": "Bangkok, Thailand",
          "isAddOn": false,
          "isConsumed": true,
          "isRevoked": false,
          "ticketCategory": 4
        },
        "signerPublicKey": "demoSignerPublicKey0987654321"
      },
      "proof": {
        "signature": "demo-signature-abcdef1234567890"
      },
      "type": "pod-ticket-pcd"
    };
    
    const encodedPod = encodeURIComponent(JSON.stringify(examplePod));
    const demoUrl = `${window.location.origin}${window.location.pathname}?pod=${encodedPod}`;
    window.location.href = demoUrl;
  };

  if (error) {
    return (
      <div className={`max-w-4xl mx-auto p-5 bg-gray-100 ${className}`}>
        <div className="bg-white rounded-xl p-8 shadow-md">
          <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
            🎫 Zupass POD Viewer
          </h1>
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="mb-3">{error}</p>
            {error.includes('URL-encoded') && (
              <p className="mb-3">
                Use <code className="bg-gray-100 px-2 py-1 rounded">encodeURIComponent(JSON.stringify(podObject))</code> before adding to URL.
              </p>
            )}
            <div className="mt-4">
              <button 
                onClick={showExample} 
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer relative z-10"
                type="button"
              >
                🎫 View Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className={`max-w-4xl mx-auto p-5 bg-gray-100 ${className}`}>
        <div className="bg-white rounded-xl p-8 shadow-md">
          <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
            🎫 Zupass POD Viewer
          </h1>
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">No POD Data Found</h2>
            <p className="mb-3">Please provide a POD object as a prop or URL parameter.</p>
            <p className="mb-3">Example: ?pod={encodeURIComponent('{"id":"...","claim":{...}}')}</p>
            <p className="mb-3 font-semibold">Note: The JSON must be URL-encoded when passed as a parameter.</p>
            <div className="mt-4">
              <button 
                onClick={showExample} 
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer relative z-10"
                type="button"
              >
                🎫 View Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-5 bg-gray-100 ${className}`}>
      <div className="bg-white rounded-xl p-8 shadow-md">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
          🎫 Zupass POD Viewer
        </h1>
        
        <div>
          {/* POD ID */}
          {pod.id && (
            <div className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800 mt-0 mb-4 pb-2 border-b-2 border-blue-500">
                POD Information
              </h2>
              {formatField('POD ID', pod.id, true)}
              {formatField('Type', pod.type || 'N/A')}
            </div>
          )}
          
          {/* Claim section (excluding nested objects) */}
          {pod.claim && renderSection('Claim Information', pod.claim)}
          
          {/* Ticket details (nested in claim) */}
          {pod.claim && pod.claim.ticket && renderSection('Ticket Details', pod.claim.ticket)}
          
          {/* Proof section */}
          {pod.proof && renderSection('Proof', pod.proof)}
          
          {/* Download button */}
          <div className="text-center mt-8 relative z-20">
            <button 
              onClick={downloadPod} 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors relative z-20"
            >
              📥 Download POD as JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZupassPodViewer; 
