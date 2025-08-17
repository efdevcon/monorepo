'use client';
import { useUser } from '@/hooks/useUser';

export default function Auth({ children }: { children: React.ReactNode }) {
  const { user, loading, error, sendMagicLink } = useUser();

  if (loading)
    return (
      <div className="h-screen w-screen text-center flex items-center justify-center">
        {loading}
      </div>
    );

  if (user) return children;

  return (
    <div className="section h-screen">
      <div className="flex flex-col gap-4 items-center justify-center h-full">
        <div className="max-w-[500px] mx-auto bg-white box-border flex flex-col gap-4 items-center justify-center pb-7 pt-6 px-6 relative rounded-[1px] w-full">
          {/* Main border with shadow */}
          <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

          {/* Get Started Button */}
          <button
            onClick={async () => {
              await sendMagicLink();
            }}
            className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_6px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors"
          >
            <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
              Log in
            </span>
          </button>

          {error && <div className="text-red-500 text-[14px]">{error}</div>}
        </div>
      </div>
    </div>
  );
}
