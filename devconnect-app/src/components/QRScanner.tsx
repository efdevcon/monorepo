import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Button from './Button';

interface QRScannerProps {
  onScan?: (result: string) => void;
  onClose?: () => void;
  buttonLabel?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onClose,
  buttonLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: string) => {
    setScanResult(result);
    onScan?.(result);
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleError = (err: unknown) => {
    setError('Camera error: ' + ((err as Error)?.message || 'Unknown error'));
  };

  return (
    <>
      <Button
        type="Primary"
        className="w-full mt-2"
        onClick={() => setOpen(true)}
      >
        {buttonLabel || 'Scan QR Code'}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={handleClose}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 flex flex-col items-center relative min-w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
            <span className="mb-2 text-center text-white font-semibold">
              Scan a QR code
            </span>
            {error && <div className="text-red-400 mb-2">{error}</div>}
            <div className="w-full flex justify-center items-center">
              <Scanner
                onScan={(detectedCodes: { rawValue: string }[]) => {
                  if (detectedCodes.length > 0) {
                    const result = detectedCodes[0].rawValue;
                    handleScan(result);
                  }
                }}
                onError={handleError}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: {
                    width: '100%',
                    height: '300px',
                  },
                  video: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}
      {scanResult && (
        <div className="p-4 bg-gray-100 rounded-md mt-4">
          <span className="font-bold text-gray-800">Last scanned QR code:</span>
          <div className="break-all text-blue-500">
            <a href={scanResult} target="_blank" rel="noopener noreferrer">
              {scanResult}
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default QRScanner; 
