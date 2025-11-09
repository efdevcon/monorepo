'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from './Button';
import { useLocalStorage } from 'usehooks-ts';
import { HEIGHT_MENU } from '@/config/config';
import { useRouter } from 'next/navigation';
import { hardReloadWithRouter } from '@/utils/reload';

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isIOS26_1] = useLocalStorage<boolean | null>('ios26_1', null);
  const [isIOS, setIsIOS] = useState(false);

  // Detect iOS
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isiOS);
  }, []);

  // Reset permission state when component mounts (user returns to page)
  useEffect(() => {
    setPermissionDenied(false);
  }, []);

  // Auto-open scanner if autoOpen prop is true
  useEffect(() => {
    if (autoOpen) {
      handleOpenScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // Handle opening the scanner
  const handleOpenScanner = () => {
    setScanResult(null);
    setPermissionDenied(false);
    setShowScanner(true);
    setOpen(true);
  };

  // Handle opening iOS settings
  const handleOpenSettings = () => {
    if (!isIOS) return;

    // Try multiple iOS settings deep link approaches
    const settingsUrls = [
      'App-prefs:root=SAFARI&path=Camera',
      'prefs:root=SAFARI&path=Camera',
      'App-prefs:root=Privacy&path=CAMERA',
      'prefs:root=Privacy&path=CAMERA',
    ];

    // Try the first URL (most likely to work on recent iOS)
    const tryOpenSettings = () => {
      // Create a hidden link and click it
      const link = document.createElement('a');
      link.href = settingsUrls[0];
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    tryOpenSettings();
  };

  const handleScan = (result: string) => {
    stopCamera();
    setScanResult(result);
    onScan?.(result);
    setOpen(false);
    // Reset permission state for next time scanner is opened
    setPermissionDenied(false);
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
    // Reset permission state for next time scanner is opened
    setPermissionDenied(false);
    onClose?.();
  };

  const handleError = (err: unknown) => {
    console.log('Scanner error:', err);
    const error = err as Error;

    // Handle permission denial - recommended approach from library docs
    if (error.name === 'NotAllowedError') {
      setPermissionDenied(true);
      console.log('Camera permission denied');
    } else {
      console.error('Scanner error:', error);
    }
  };

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
      <Button
        type="Primary"
        className="w-full mt-2"
        onClick={handleOpenScanner}
      >
        {buttonLabel || 'Scan QR Code'}
      </Button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70"
            style={{
              height: isIOS26_1
                ? `calc(100dvh - 93px)`
                : `calc(100dvh - ${HEIGHT_MENU}px - max(0px, env(safe-area-inset-bottom))`,
            }}
            onClick={handleClose}
          >
            <div
              className="w-full h-full bg-gray-900 flex flex-col items-center relative min-w-[260px]"
              onClick={(e) => e.stopPropagation()}
            >
              {permissionDenied ? (
                // Permission denied UI
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-6">
                    <svg
                      className="w-16 h-16 text-blue-400 mx-auto mb-4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Camera Access Required
                    </h3>
                    <p className="text-gray-300 mb-2">
                      Camera access was blocked. To scan QR codes, you need to
                      enable camera permissions.
                    </p>
                    {isIOS ? (
                      <div className="text-gray-400 text-sm mb-6">
                        <p className="mb-2">To enable camera access on iOS:</p>
                        <ol className="text-left list-decimal list-inside space-y-1 mb-3">
                          <li>Open iOS system settings</li>
                          <li>Go to Apps at the bottom of the screen</li>
                          <li>Find Safari and tap on it</li>
                          <li>Find Camera at the bottom of the screen</li>
                          <li>Choose Allow</li>
                          <li>Return here and try scanning again</li>
                        </ol>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm mb-6">
                        Look for the camera icon in your browser's address bar,
                        click it, and allow camera access. Then close this and
                        try scanning again.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={handleClose}
                      className="bg-[#0073de] text-white px-6 py-3 rounded text-sm font-bold shadow-[0px_4px_0px_0px_#005493] hover:bg-[#005493] transition-colors"
                    >
                      Make manual payment
                    </button>
                    <button
                      onClick={async () => {
                        setIsReloading(true);
                        await hardReloadWithRouter(router);
                      }}
                      disabled={isReloading}
                      className="bg-[#eaf3fa] flex items-center justify-center px-6 py-3 rounded-[1px] text-[#44445d] font-bold text-[16px] border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReloading
                        ? 'Reloading page...'
                        : 'Reset camera permissions'}
                    </button>
                  </div>
                </div>
              ) : (
                // Scanner UI
                <>
                  <div
                    className="w-full flex-1 flex justify-center items-center overflow-hidden relative"
                    ref={scannerRef}
                  >
                    {showScanner && (
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
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-transparent">
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <button
                        onClick={handleClose}
                        className="bg-[#0073de] text-white px-6 py-3 rounded text-sm font-bold shadow-[0px_4px_0px_0px_#005493] hover:bg-[#005493] transition-colors"
                      >
                        Make manual payment
                      </button>
                    </div>
                  </div>
                </>
              )}
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
