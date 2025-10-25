'use client';

import { useLocalStorage } from 'usehooks-ts';

interface ComingSoonContainerProps {
  content: string;
  children: React.ReactNode;
}

export default function ComingSoonContainer({ content, children }: ComingSoonContainerProps) {
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-8 px-4 relative flex-1"
      style={{
        backgroundImage:
          'linear-gradient(-8.90443e-07deg, rgba(246, 182, 19, 0.15) 0%, rgba(255, 133, 166, 0.15) 9.0741%, rgba(152, 148, 255, 0.15) 18.289%, rgba(116, 172, 223, 0.15) 42.138%, rgba(242, 249, 255, 0.15) 55.067%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
        marginTop: pwa ? '60px' : '0',
      }}
    >
      <div className="flex flex-col items-center gap-10 w-full max-w-[345px]">
        <div className="flex flex-col gap-3 items-center w-full">
          <pre
            className="text-[0.4rem] lg:text-[0.55rem] leading-tight max-w-full select-text"
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              color: '#353548',
            }}
          >
            {content}
          </pre>
        </div>

        {children}
      </div>
    </div>
  );
}

