'use client';
import { use, useEffect, useState } from 'react';
import QRCode from 'qrcode';

const s = ({ params }: { params: Promise<{ stage: string }> }) => {
  const { stage } = use(params);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      const stageUrl = `${window.location.origin}/stages/${stage}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(stageUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCodeUrl(qrDataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
  }, [stage]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f3f4f6',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '20px', color: '#1f2937' }}>
        {stage}
      </h1>
      {qrCodeUrl && (
        <div
          style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <img
            src={qrCodeUrl}
            alt="QR Code"
            style={{ width: '300px', height: '300px' }}
          />
        </div>
      )}
      <p style={{ marginTop: '20px', color: '#6b7280' }}>
        Scan For Programming
      </p>
    </div>
  );
};

export default s;
