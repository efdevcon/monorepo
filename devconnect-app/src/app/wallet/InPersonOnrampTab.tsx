'use client';

import { useRouter } from 'next/navigation';

// Image assets
const imgRipio = "/images/ripio-logo.png";
const imgCalypso = "/images/calypso-logo.png";
const imgLocationOn = "/images/imgLocation.svg";

export default function InPersonOnrampTab() {
  const router = useRouter();

  const providers = [
    {
      name: 'Ripio',
      description: 'Blurb for Ripio lorem ipsum dolor sit amet consectetur.',
      logo: imgRipio,
      fees: 'X%',
      locations: ['Pabellón Verde', 'Pista Central'],
      gradient: 'linear-gradient(135deg, rgba(105, 14, 216, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
    },
    {
      name: 'Calypso',
      description: 'Blurb for Calypso lorem ipsum dolor sit amet consectetur.',
      logo: imgCalypso,
      fees: 'X%',
      locations: ['Pabellón Verde', 'Pista Central'],
      gradient: 'linear-gradient(135deg, rgba(52, 138, 237, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)',
    },
  ];

  return (
    <div className="bg-[#f6fafe] min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[#eeeeee] px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/wallet')}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="#36364c"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-[#36364c] text-base font-bold tracking-[-0.1px]">
            In-person exchanges
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4">
        {/* Title Section */}
        <div className="mb-4">
          <h2 className="text-[#242436] text-xl font-bold leading-[1.2] tracking-[-0.1px] mb-2">
            Swap physical currency for crypto
          </h2>
          <p className="text-[#36364c] text-sm leading-[1.3]">
            Partners accept ARS/USD and Debit/Credit card
          </p>
        </div>

        {/* Provider Cards */}
        <div className="space-y-3">
          {providers.map((provider, index) => (
            <div
              key={index}
              className="border border-[#f0f0f4] rounded p-4 flex gap-3"
              style={{ background: provider.gradient }}
            >
              {/* Provider Icon */}
              <div 
                className="w-8 h-8 rounded flex-shrink-0 bg-center bg-cover bg-no-repeat"
                style={{ backgroundImage: `url('${provider.logo}')` }}
              />

              {/* Provider Info */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <div className="text-[#242436] text-base font-bold leading-[1.2] tracking-[-0.1px]">
                    {provider.name}
                  </div>
                  <div className="text-[#36364c] text-sm leading-[1.3] tracking-[-0.1px]">
                    {provider.description}
                  </div>
                  <div className="text-[#36364c] text-xs leading-[1.3] tracking-[-0.1px]">
                    <span className="font-bold">Fees:</span> {provider.fees}
                  </div>
                </div>

                {/* Location Links */}
                <div className="flex gap-2">
                  {provider.locations.map((location, locIndex) => (
                    <div
                      key={locIndex}
                      className="flex-1 bg-[rgba(255,255,255,0.4)] border border-[#f0f0f4] rounded px-2 py-1 flex flex-col items-center gap-0.5"
                    >
                      <div className="w-5 h-5">
                        <img
                          src={imgLocationOn}
                          alt="Location"
                          className="w-full h-full"
                        />
                      </div>
                      <div className="text-[#36364c] text-xs font-bold text-center tracking-[-0.1px] leading-[1.3]">
                        {location}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
