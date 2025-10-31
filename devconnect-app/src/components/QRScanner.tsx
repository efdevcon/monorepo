'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from './Button';
import { useLocalStorage } from 'usehooks-ts';
import { HEIGHT_MENU } from '@/config/config';

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
    onClose?.();
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
            style={{
              height: `calc(100vh - ${HEIGHT_MENU}px - max(0px, env(safe-area-inset-bottom))`,
            }}
            onClick={handleClose}
          >
            <div
              className="w-full h-full bg-gray-900 flex flex-col items-center relative min-w-[260px]"
              onClick={(e) => e.stopPropagation()}
            >
              {error && <div className="text-red-400 mt-2 mb-2">{error}</div>}
              <div
                className="w-full flex-1 flex justify-center items-center overflow-hidden relative"
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
                    // onOff: true,
                    finder: true,
                    torch: false,
                    zoom: false,
                  }}
                  styles={{
                    container: {
                      backgroundColor: 'transparent',
                      height: '100%',
                    },
                    video: {
                      borderRadius: '0',
                    },
                  }}
                  // TEMP: Disable sound
                  sound={false}
                />
                {/* Scan payment QR code text positioned over the scanner */}
                {/* <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="text-white font-semibold text-lg">
                    Scan payment QR code
                  </span>
                </div> */}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-transparent">
                {/* Having trouble scanning link */}
                <div className="mt-3 flex flex-col items-center gap-2">
                  {/* <p className="text-white text-sm font-bold text-center">
                    Having trouble scanning?
                  </p> */}
                  <button
                    onClick={handleClose}
                    className="bg-[#0073de] text-white px-6 py-3 rounded text-sm font-bold shadow-[0px_4px_0px_0px_#005493] hover:bg-[#005493] transition-colors"
                  >
                    Make manual payment
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
