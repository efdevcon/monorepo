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
      className="min-h-screen flex flex-col items-center justify-center p-2 py-2"
      style={{ backgroundColor: 'white', marginTop: pwa ? '60px' : '0' }}
    >
      <div className="flex-1 flex items-center justify-center">
        <pre
          className="text-[0.4rem] lg:text-[0.55rem] leading-tight overflow-auto max-w-full select-text"
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
  );
}

