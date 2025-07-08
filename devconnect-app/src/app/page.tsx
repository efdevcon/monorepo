import Image from 'next/image';

import Button from '@/components/Button';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div>
          <div
            className="w-80 px-6 pt-6 pb-7 rounded-[1px] shadow-[0px_8px_0px_0px_rgba(54,54,76,1.00)] outline outline-1 outline-offset-[-0.50px] outline-white inline-flex flex-col justify-center items-center gap-4"
            style={{
              background: 'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF'
            }}
          >
            <div className="self-stretch flex flex-col justify-start items-start gap-3">
              <Image src="/images/devonnect-arg-pathfinder.png" alt="Logo" width={240} height={240} />
              <div className="self-stretch justify-start text-gray-700 text-lg font-normal font-['Roboto'] leading-relaxed">
                Your companion for Devconnect ARG, the first Ethereum World’s
                Fair.
              </div>
            </div>
            <Button type="Primary">Get started</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
