'use client';
import QRScanner from '@/components/QRScanner';

export default function Zkp2pScannerPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-white text-2xl mb-4">Scan a ZKP2P QR Code</h1>
      <QRScanner
        buttonLabel="Start Scanning"
        onScan={(value) => {
          if (value.startsWith('https://www.zkp2p.xyz/swap?')) {
            window.location.replace(value);
          } else {
            alert('Scanned QR code is not a valid ZKP2P link.');
          }
        }}
      />
      <div className="text-gray-400 mt-6 text-center">
        Please allow camera access and scan a ZKP2P QR code to continue.
      </div>
    </div>
  );
} 
