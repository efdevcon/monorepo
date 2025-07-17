'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion'
import cn from 'classnames'
import { Download } from 'lucide-react'

// Remove old interfaces and define new ones for the new structure
interface PodEntries {
  attendeeEmail: string;
  attendeeName: string;
  eventId: string;
  eventLocation: string;
  eventName: string;
  eventStartDate: string;
  imageUrl: string;
  isAddOn: boolean;
  isConsumed: boolean;
  isRevoked: boolean;
  productId: string;
  ticketCategory: number;
  ticketId: string;
  ticketName: string;
  ticketSecret: string;
  timestampConsumed: number;
  timestampSigned: number;
  [key: string]: any;
}

interface PodData {
  entries: PodEntries
  signature: string
  signerPublicKey: string
  [key: string]: any
}

interface ZupassPodViewerProps {
  podData?: PodData | string;
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const titleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
      delay: 0.1,
    },
  },
};

const ZupassPodViewer: React.FC<ZupassPodViewerProps> = ({ podData, className = '' }) => {
  const [pod, setPod] = useState<PodData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('ZupassPodViewer mounted');
  }, []);

  useEffect(() => {
    if (podData) {
      console.log('podData', podData)
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
        console.log('podParam', podParam)
        // Check if the pod parameter contains the placeholder
        if (podParam?.includes('pod_encoded')) {
          setError(
            "We apologize, we sent the wrong link in the email. We'll follow up with the correct link in the next few days."
          )
          setPod(null)
          return
        }

        try {
          // First try to parse as-is (in case it's already decoded)
          const parsedPod = JSON.parse(podParam)
          setPod(parsedPod)
          setError(null)
        } catch (e1) {
          try {
            // If that fails, try URL decoding first
            const parsedPod = JSON.parse(decodeURIComponent(podParam))
            setPod(parsedPod)
            setError(null)
          } catch (e2) {
            setError(
              `Error parsing POD data: ${
                e2 instanceof Error ? e2.message : 'Unknown error'
              }. The JSON must be properly URL-encoded.`
            )
            setPod(null)
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
      <span
        className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
          value ? 'bg-[#9BEFA0] text-gray-800 border border-black border-solid' : 'bg-gray-200 text-gray-800'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    )
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
            onError={e => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
          {/* <div className="mt-2 text-sm text-[#4B4B66]">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View full size
            </a>
          </div> */}
        </div>
      )
    }
    
    return (
      <div className="flex mb-3 items-start flex-col sm:flex-row" key={label}>
        <div className="font-semibold text-[#4B4B66] min-w-[200px] flex-shrink-0 mb-1 sm:mb-0">{label}:</div>
        <div className="text-gray-800 break-all flex-1">{displayValue}</div>
      </div>
    )
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
      <motion.div
        variants={itemVariants}
        className="mb-6 p-5 border border-gray-200 rounded-lg bg-white shadow-sm"
        key={title}
      >
        <h2 className="text-xl font-semibold text-gray-800 mt-0 mb-4 pb-2 border-b-2 border-[#C6E1F9] font-secondary">
          {title}
        </h2>
        {fields}
      </motion.div>
    )
  };

  const downloadPod = (): void => {
    if (!pod) {
      alert('No POD data found')
      return
    }
    let filename = 'pod-data.json'
    if (typeof pod.entries.ticketId === 'string' && pod.entries.ticketId.length > 0) {
      filename = `pod-${pod.entries.ticketId.substring(0, 8)}.json`
    }
    let podString = ''
    try {
      podString = JSON.stringify(pod, null, 2)
    } catch (err) {
      alert('Error serializing POD data: ' + (err instanceof Error ? err.message : 'Unknown error'))
      return
    }
    try {
      const blob = new Blob([podString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Error downloading POD: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const showExample = (): void => {
    const examplePod: PodData = {
      entries: {
        attendeeEmail: "demo.user@example.com",
        attendeeName: "Demo User",
        eventId: "5074edf5-f079-4099-b036-22223c0c6995",
        eventLocation: "Bangkok, Thailand",
        eventName: "Devcon 7",
        eventStartDate: "2024-11-09T08:00:00.000",
        imageUrl: "/images/devcon/devcon-landscape.webp",
        isAddOn: false,
        isConsumed: true,
        isRevoked: false,
        productId: "08482abb-8767-47aa-be47-2691032403b6",
        ticketCategory: 4,
        ticketId: "demo-ticket-id-5678",
        ticketName: "Demo Ticket",
        ticketSecret: "demo-secret-1234",
        timestampConsumed: 1731295434188,
        timestampSigned: 1750679115735
      },
      signature: "demo-signature-abcdef1234567890",
      signerPublicKey: "demoSignerPublicKey0987654321"
    };
    
    const encodedPod = encodeURIComponent(JSON.stringify(examplePod));
    const demoUrl = `${window.location.origin}${window.location.pathname}?pod=${encodedPod}`;
    window.location.href = demoUrl;
  };

  if (error) {
    return (
      <motion.div
        className={cn('max-w-4xl mx-auto p-5', className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="bg-white rounded-xl p-8 shadow-md border border-gray-200" variants={itemVariants}>
          <motion.h1
            className="text-4xl font-bold text-gray-800 text-center mb-8 font-secondary"
            variants={titleVariants}
          >
            🎫 Zupass POD Viewer
          </motion.h1>
          <motion.div
            className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg overflow-hidden"
            variants={itemVariants}
          >
            <h2 className="text-xl font-semibold mb-2 font-secondary">Error</h2>
            <p className="mb-3">{error}</p>
            {error.includes('URL-encoded') && (
              <p className="mb-3">
                Use <code className="bg-gray-100 px-2 py-1 rounded">encodeURIComponent(JSON.stringify(podObject))</code>{' '}
                before adding to URL.
              </p>
            )}
            <motion.div className="mt-4" variants={itemVariants}>
              <button
                onClick={showExample}
                className="inline-block bg-[#9BEFA0] hover:bg-[#8BDF90] text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer border border-black border-solid transform hover:scale-105 transition-transform duration-300"
                type="button"
              >
                🎫 View Demo
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  if (!pod) {
    return (
      <motion.div
        className={cn('max-w-4xl mx-auto p-5', className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="bg-white rounded-xl p-8 shadow-md border border-gray-200" variants={itemVariants}>
          <motion.h1
            className="text-4xl font-bold text-gray-800 text-center mb-8 font-secondary"
            variants={titleVariants}
          >
            Devcon SEA Zupass POD 🎫
          </motion.h1>
          <h2 className="text-xl font-semibold mb-2 font-secondary">No POD Data Found</h2>
          <motion.div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg" variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-2 font-secondary">No POD Data Found</h2>
            <p className="mb-3">Please provide a POD object as a prop or URL parameter.</p>
            <p className="mb-3">Example: ?pod={encodeURIComponent('{"id":"...","claim":{...}}')}</p>
            <p className="mb-3 font-semibold">Note: The JSON must be URL-encoded when passed as a parameter.</p>
            <motion.div className="mt-4" variants={itemVariants}>
              <button
                onClick={showExample}
                className="inline-block bg-[#9BEFA0] hover:bg-[#8BDF90] text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer border border-black border-solid transform hover:scale-105 transition-transform duration-300"
                type="button"
              >
                🎫 View Demo
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  // Update UI rendering logic for new structure
  // Remove claim, ticket, proof, type, id, etc. Only use entries, signature, signerPublicKey

  return (
    <motion.div
      className={cn('max-w-4xl mx-auto p-5', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        style={{
          borderRadius: '1px',
          border: '1px solid var(--Primary-light-blue, #74ACDF)',
          background: 'linear-gradient(180deg, #F7FBFF -6.53%, #C4DDF4 100%)',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)'
        }}
        className={cn('max-w-4xl mx-auto', className)}
        variants={itemVariants}
      >
        <motion.h1
          className="text-4xl font-bold text-gray-800 text-center mb-8 font-secondary"
          variants={titleVariants}
        >
          Devcon SEA Zupass POD 🎫
        </motion.h1>

          {/* Download button */}
          <motion.div className="text-center mt-8 relative z-20" variants={itemVariants}>
            <div
              className="size- px-8 py-4 bg-white shadow-[0px_4px_0px_0px_rgba(75,75,102,1.00)] outline outline-1 outline-offset-[-1px] outline-[#4b4b66] inline-flex justify-center items-center gap-2 cursor-pointer select-none"
              onClick={downloadPod}
              role="button"
              tabIndex={0}
              onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') downloadPod(); }}
            >
              <div className="text-center justify-start text-[#36364c] text-base font-bold font-['Roboto'] leading-none">Download POD (.json)</div>
              <div className="size-5 flex items-center justify-center">
                <Download className="w-[15px] h-[15px] text-[#36364c]" />
              </div>
            </div>
          </motion.div>
          <div className="my-8 self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-[#b5b5c8]" />
        <motion.div variants={containerVariants} className="pt-8  ">
          {/* Entries section */}
          {pod.entries && renderSection('Zupass POD Data', pod.entries)}

          {/* Signature and Signer Public Key */}
          <motion.div variants={itemVariants} className="mb-6 p-5 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mt-0 mb-4 pb-2 border-b-2 border-[#C6E1F9] font-secondary">
              Signature Info
            </h2>
            {formatField('Signature', pod.signature, true)}
            {formatField('Signer Public Key', pod.signerPublicKey, true)}
          </motion.div>

        </motion.div>
      </motion.div>
    </motion.div>
  )
};

export default ZupassPodViewer; 
