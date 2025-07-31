'use client';
import QRScanner from '@/components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';

export default function WalletPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-white text-2xl mb-4">Wallet</h1>
      <div className="flex flex-col items-center justify-center mt-6">
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
      </div>
      <div className="flex flex-col items-center justify-center mt-6">
        {/* Generate a QR Code from this link https://www.pagar.simplefi.tech/cafe-cuyo/amount/0.01 */}
        <QRCodeSVG
          value={'https://www.pagar.simplefi.tech/cafe-cuyo/amount/0.01'}
          title={'Cafe Cuyo'}
          size={180}
          bgColor={'#000000'}
          fgColor={'#ffffff'}
          level={'H'}
          imageSettings={{
            src: 'https://www.pagar.simplefi.tech/icon.png',
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            opacity: 1,
            excavate: true,
          }}
        />
      </div>
    </div>
  );
}
