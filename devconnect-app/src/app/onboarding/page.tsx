'use client';

import Onboarding from '@/components/Onboarding';
// import midjEpicCity3 from '@/images/midj-epic-city3.png';
import fullWidthBackground from '@/images/pwa-onboarding-hero-img.jpg';
import Image from 'next/image';

export default function OnboardingPage() {
  return (
    <div
      className="min-h-screen h-full flex items-center justify-center p-4 grow"
      // style={{
      //   backgroundImage: `url('${midjEpicCity3.src}')`,
      //   backgroundSize: 'cover',
      //   backgroundPosition: 'center',
      //   backgroundRepeat: 'no-repeat',
      //   backgroundAttachment: 'fixed',
      // }}
    >
      <Image
        src={fullWidthBackground}
        alt="Midj Epic City 3"
        className="absolute inset-0 w-full h-full object-cover"
        fill
      />
      <div className="max-w-md w-full">
        <Onboarding />
      </div>
    </div>
  );
}
