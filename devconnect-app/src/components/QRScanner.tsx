'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from './Button';
import { useLocalStorage } from 'usehooks-ts';

interface QRScannerProps {
  onScan?: (result: string) => void;
  onClose?: () => void;
  buttonLabel?: string;
  autoOpen?: boolean;
}

const QRScanner = ({
  onScan,
  onClose,
  buttonLabel,
  autoOpen = false,
}: QRScannerProps) => {
  const [open, setOpen] = useState(false);
  const [pwa] = useLocalStorage('pwa', false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const scannerRef = useRef<HTMLDivElement>(null);

  // Check and monitor camera permission status
  const checkCameraPermission = useCallback(async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permission = await navigator.permissions.query({
          name: 'camera',
        });
        setPermissionStatus(permission.state); // 'granted', 'denied', or 'prompt'
        // Monitor permission changes (e.g., if user changes settings)
        permission.onchange = () => {
          setPermissionStatus(permission.state);
          if (permission.state === 'granted' && error) {
            setError(null); // Clear error if permission is granted
          }
        };
        return permission.state;
      } catch (err) {
        console.warn('Permission API not supported:', err);
        setPermissionStatus('unknown');
        return 'unknown';
      }
    }
    setPermissionStatus('unknown');
    return 'unknown';
  }, [error]);

  // Initialize permission check on component mount
  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  // Auto-open scanner if autoOpen prop is true
  useEffect(() => {
    if (autoOpen) {
      handleOpenScanner();
    }
  }, [autoOpen]);

  // Handle opening the scanner
  const handleOpenScanner = async () => {
    const status = await checkCameraPermission();
    if (status === 'denied') {
      setError(
        'Camera access is denied. Please enable camera access in Settings > Privacy > Camera for this app.'
      );
      return;
    }
    setError(null); // Clear any previous errors
    setOpen(true);
  };

  const handleScan = (result: string) => {
    stopCamera();
    setScanResult(result);
    onScan?.(result);
    setOpen(false);
  };

  // Function to stop camera stream
  const stopCamera = () => {
    if (scannerRef.current) {
      try {
        // Access the video element and stop all tracks
        const videoElement = scannerRef.current.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    setOpen(false);
    setManualCode('');
    onClose?.();
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const handleError = (err: unknown) => {
    const errorMessage = (err as Error)?.message || 'Unknown error';
    if (errorMessage.includes('NotAllowedError')) {
      setError(
        'Camera access is required to scan QR codes. Please enable camera access in Settings > Privacy > Camera.'
      );
      setPermissionStatus('denied');
    } else {
      setError(`Camera error: ${errorMessage}`);
    }
  };

  // Reset error when closing the scanner
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  // Cleanup camera when component unmounts
  useEffect(() => {
    return () => {
      if (open) {
        stopCamera();
      }
    };
  }, [open]);

  return (
    <>
      {/* Display permission status */}
      {/* {permissionStatus && (
        <div className="p-2 text-gray-600 text-sm">
          Camera Permission:{' '}
          {permissionStatus === 'granted'
            ? 'Ready'
            : permissionStatus === 'denied'
              ? 'Denied (Enable in Settings)'
              : permissionStatus === 'prompt'
                ? 'Not requested yet'
                : 'Unknown (Browser may not support permission checks)'}
        </div>
      )} */}
      <Button
        type="Primary"
        className="w-full mt-2"
        onClick={handleOpenScanner}
        disabled={permissionStatus === 'denied'} // Disable button if permission is denied
      >
        {buttonLabel || 'Scan QR Code'}
      </Button>
      {error && !open && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md mt-4">
          {error}
        </div>
      )}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70"
            style={{ height: `calc(100vh - ${pwa ? '91px' : '72px'})` }}
            onClick={handleClose}
          >
            <div
              className="w-full h-full bg-gray-900 flex flex-col items-center relative min-w-[260px]"
              onClick={(e) => e.stopPropagation()}
            >
              {error && <div className="text-red-400 mt-2 mb-2">{error}</div>}
              <div
                className="w-full flex-1 flex justify-center items-center overflow-hidden"
                ref={scannerRef}
              >
                <Scanner
                  onScan={(detectedCodes: { rawValue: string }[]) => {
                    if (detectedCodes.length > 0) {
                      const result = detectedCodes[0].rawValue;
                      handleScan(result);
                    }
                  }}
                  onError={handleError}
                  constraints={{ facingMode: 'environment' }}
                  formats={['qr_code']}
                  allowMultiple={true}
                  components={{
                    onOff: true,
                    finder: true,
                    torch: false,
                    zoom: false,
                  }}
                  styles={{
                    container: {
                      backgroundColor: 'transparent',
                      height: 'calc(100% - 118px)',
                    },
                    video: {
                      borderRadius: '0',
                    },
                  }}
                  // TEMP: Disable sound
                  sound={false}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-center text-white font-semibold">
                    Scan payment QR code
                  </span>
                  <button
                    className="text-gray-400 hover:text-white text-2xl font-bold"
                    onClick={handleClose}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Manual Code Input */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter code manually..."
                    className="flex-1 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-[#1b6fae]"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualCode.trim()}
                    className="px-4 py-2 bg-[#1b6fae] text-white rounded-lg hover:bg-[#155a8f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* {scanResult && (
        <div className="p-4 bg-gray-100 rounded-md mt-4">
          <span className="font-bold text-gray-800">Last scanned QR code:</span>
          <div className="break-all text-blue-500">
            <a href={scanResult} target="_blank" rel="noopener noreferrer">
              {scanResult}
            </a>
          </div>
        </div>
      )} */}
    </>
  );
};

export default QRScanner;
