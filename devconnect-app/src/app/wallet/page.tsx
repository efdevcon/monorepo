'use client';
import { useState } from 'react';
import QRScanner from '@/components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import ManualPaymentModal from '@/components/ManualPaymentModal';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

export default function WalletPage() {
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const { isPara } = useUnifiedConnection();

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

      {/* Manual Payment Button */}
      <div className="mt-6">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 cursor-pointer bg-white text-black hover:bg-gray-100"
          onClick={() => setIsManualPaymentOpen(true)}
        >
          <CreditCard className="h-4 w-4" />
          Manual Payment
        </Button>
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

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        isOpen={isManualPaymentOpen}
        onClose={() => setIsManualPaymentOpen(false)}
        isPara={Boolean(isPara)}
      />
    </div>
  );
}
