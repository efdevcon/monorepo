'use client';
import QRScanner from '@/components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';

export default function WalletPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-white text-2xl mb-4">Wallet</h1>
      <QRScanner
        buttonLabel="Scan Payment QR Code"
        onScan={(value) => {
          // open link in new tab
          window.open(value, '_blank');
        }}
        onClose={() => {
          console.log('close');
          window.open(
            'https://www.pagar.simplefi.tech/cafe-cuyo/amount/0.01',
            '_blank'
          );
        }}
      />
      <div className="text-gray-400 mt-6 text-center">
        Please allow camera access and scan a payment QR code to continue.
      </div>
      <div className="flex flex-col items-center justify-center mt-6">
        {/* Generate a QR Code from this link https://www.pagar.simplefi.tech/cafe-cuyo/amount/0.01 */}
        <QRCodeSVG
          value={'https://www.pagar.simplefi.tech/cafe-cuyo/amount/0.01'}
          title={'Cafe Cuyo'}
          size={128}
          bgColor={'#ffffff'}
          fgColor={'#000000'}
          level={'L'}
          imageSettings={{
            src: 'https://www.pagar.simplefi.tech/icon.png',
            x: undefined,
            y: undefined,
            height: 36,
            width: 36,
            opacity: 1,
            excavate: true,
          }}
        />
      </div>
    </div>
  );
}
