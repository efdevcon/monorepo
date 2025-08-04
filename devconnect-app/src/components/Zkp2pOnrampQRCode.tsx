import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Zkp2pOnrampQRCodeProps {
  address: string;
}

const Zkp2pOnrampQRCode = ({ address }: Zkp2pOnrampQRCodeProps) => {
  const [open, setOpen] = useState(false);
  const callbackUrl = `https://${window.location.host}/api/quest/?quest=zkp2p&address=${address}`;
  const zkp2pUrl =
    'https://www.zkp2p.xyz/swap?referrer=Devconnect' +
    '&referrerLogo=https%3A%2F%2Fdevconnect.org%2Fapple-icon.png' +
    `&callbackUrl=${encodeURIComponent(callbackUrl)}` +
    '&toToken=8453%3A0x0000000000000000000000000000000000000000' +
    '&recipientAddress=0xbd19a3f0a9cace18513a1e2863d648d13975cb30' +
    '&tab=buy';

  return (
    <>
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        Onramp via ZKP2P
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 flex flex-col items-center relative min-w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold cursor-pointer"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="mb-2 text-center text-white font-semibold">
              Scan this QR code at the ZKP2P booth to buy crypto
            </span>
            <QRCodeSVG
              value={zkp2pUrl}
              size={192}
              bgColor="#000000"
              fgColor="#ffffff"
              level="M"
              includeMargin
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Zkp2pOnrampQRCode; 
