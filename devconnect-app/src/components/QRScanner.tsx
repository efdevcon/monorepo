'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from './Button';
import { useLocalStorage } from 'usehooks-ts';
import { HEIGHT_MENU } from '@/config/config';
import { useRouter } from 'next/navigation';
import { hardReloadWithRouter } from '@/utils/reload';
import { toast } from 'sonner';
import CameraPermissionIcon from '@/images/camera-permission.png';
import Image from 'next/image';

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
    // Reset permission state for next time scanner is opened
    setPermissionDenied(false);
    // Call onClose callback before state changes to ensure navigation happens
    onClose?.();
    setOpen(false);
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
      {/* <Button
        type="Secondary"
        className="w-full mt-2"
        onClick={handleOpenScanner}
      >
        {buttonLabel || 'Scan QR Code'}
      </Button> */}
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
              className="w-full h-full bg-[#20202b] flex flex-col items-center relative min-w-[260px]"
              onClick={(e) => e.stopPropagation()}
            >
              {permissionDenied ? (
                // Permission denied UI
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                  <div className="flex flex-col gap-6 items-center max-w-[345px] w-full">
                    {/* Camera Icon */}
                    <div className="w-20 h-20 shrink-0">
                      <Image
                        src={CameraPermissionIcon}
                        alt="Camera permission"
                        className="w-full h-full"
                        width={80}
                        height={80}
                      />
                    </div>

                    {/* Message Container */}
                    <div className="flex flex-col gap-4 w-full">
                      {/* Title and Description */}
                      <div className="flex flex-col gap-3 text-center tracking-[-0.1px]">
                        <h3 className="font-bold text-white text-2xl leading-[1.2]">
                          Camera access required
                        </h3>
                        <p className="text-[#c7c7d0] text-base leading-[1.3]">
                          To scan QR codes, you need to enable camera
                          permissions for the app.
                        </p>
                      </div>

                      {/* Instructions */}
                      <div className="flex flex-col gap-2 text-[#c7c7d0] text-base tracking-[-0.1px]">
                        <p className="font-bold leading-[1.3]">
                          To enable camera access permanently:
                        </p>
                        <ol className="list-decimal text-left leading-[1.3] pl-6 space-y-0">
                          <li>Locate the app in your device Settings</li>
                          <li>Find and open Camera permissions.</li>
                          <li>Set it to "Allow" or "Always allow"</li>
                          <li>Refresh or restart to apply the changes</li>
                        </ol>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-3 w-full">
                      <button
                        onClick={handleClose}
                        className="bg-[#0073de] text-white px-6 py-4 rounded-[1px] text-base font-bold shadow-[0px_4px_0px_0px_#005493] hover:bg-[#005493] transition-colors w-full"
                      >
                        Make manual payment
                      </button>
                      <button
                        onClick={async () => {
                          // Check last reset time from localStorage
                          const lastResetTime = localStorage.getItem(
                            'lastCameraResetTime'
                          );
                          const currentTime = Date.now();
                          const oneMinute = 60 * 1000; // 1 minute in milliseconds

                          if (lastResetTime) {
                            const timeSinceLastReset =
                              currentTime - parseInt(lastResetTime);

                            if (timeSinceLastReset < oneMinute) {
                              // User clicked within 1 minute, show toast instead of resetting
                              toast.error('Kill the app and open it again', {
                                description:
                                  'Close the app completely and reopen it to reset camera permissions.',
                                duration: 8000,
                              });
                              return;
                            }
                          }

                          // Store current time in localStorage
                          localStorage.setItem(
                            'lastCameraResetTime',
                            currentTime.toString()
                          );

                          setIsReloading(true);
                          try {
                            // Close the scanner modal first
                            stopCamera();
                            console.log('🔄 Simulating app kill...');
                            // Use window.location for complete page reload
                            window.location.href = '/wallet';
                          } catch (err) {
                            console.error('Error during app reset:', err);
                            // Fallback to direct navigation
                            alert('"Kill the app" then open it again.');
                          }
                        }}
                        disabled={isReloading}
                        className="bg-[#eaf3fa] text-[#44445d] px-6 py-4 rounded-[1px] text-base font-bold shadow-[0px_4px_0px_0px_#595978] hover:bg-[#d5e5f0] transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReloading
                          ? 'Reset in progress...'
                          : 'Reset camera permissions'}
                      </button>
                    </div>
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
