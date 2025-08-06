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
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    recipient: string;
    amount: string;
  }>({
    recipient: '0x6B13eC21447548B420aC8d6b74D8f4da0A4fD26E',
    amount: '0.01',
  });
  const { isPara } = useUnifiedConnection();

  // Payment information from API response
  const paymentData = {
    address: '0x6B13eC21447548B420aC8d6b74D8f4da0A4fD26E',
    chain_id: 8453,
    amount: 0.01,
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC contract address on Base
  };

  // Convert amount to wei (USDC has 6 decimals)
  const amountInWei = Math.floor(paymentData.amount * 1000000); // 0.01 USDC = 10000 wei

  // Create EIP-681 format payment request
  const eip681Url = `ethereum:${paymentData.token}@${paymentData.chain_id}/transfer?address=${paymentData.address}&uint256=${amountInWei}`;
  // ethereum:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913@8453/transfer?address=0x6B13eC21447548B420aC8d6b74D8f4da0A4fD26E&uint256=10000

  // Function to parse EIP-681 URL and extract payment data
  const parseEIP681Url = (url: string) => {
    try {
      // Parse the EIP-681 URL format: ethereum:contract@chainId/function?params
      const match = url.match(
        /^ethereum:([^@]+)@(\d+)\/transfer\?address=([^&]+)&uint256=(\d+)$/
      );

      if (match) {
        const [, contractAddress, chainId, recipientAddress, amountWei] = match;

        // Convert wei back to USDC (6 decimals)
        const amountInUSDC = parseInt(amountWei) / 1000000;

        return {
          recipient: recipientAddress,
          amount: amountInUSDC.toString(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing EIP-681 URL:', error);
      return null;
    }
  };

  // Handle QR code scan
  const handleQRScan = (value: string) => {
    const parsedData = parseEIP681Url(value);

    if (parsedData) {
      setPrefilledPaymentData(parsedData);
      setIsManualPaymentOpen(true);
    } else {
      // If not an EIP-681 URL, try to open it as a regular link
      window.open(value, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-white text-2xl mb-4">Wallet</h1>
      <div className="flex flex-col items-center justify-center mt-6">
        <QRScanner
          buttonLabel="Scan Payment QR Code"
          onScan={handleQRScan}
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
        {/* Generate a QR Code with EIP-681 payment request */}
        <QRCodeSVG
          value={eip681Url}
          title={'Payment QR Code'}
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
        <p className="text-white text-sm mt-2 text-center">
          Amount: $0.01 USDC
          <br />
          Address: 0x6B13eC21447548B420aC8d6b74D8f4da0A4fD26E
          <br />
          Chain: Base (8453)
        </p>
      </div>

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        isOpen={isManualPaymentOpen}
        onClose={() => setIsManualPaymentOpen(false)}
        isPara={Boolean(isPara)}
        initialRecipient={prefilledPaymentData.recipient}
        initialAmount={prefilledPaymentData.amount}
      />
    </div>
  );
}
