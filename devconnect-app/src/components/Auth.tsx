'use client';
import { useUser } from '@/hooks/useUser';
import { useState } from 'react';

export default function Auth({ children }: { children: React.ReactNode }) {
  const { user, loading, error, hasInitialized, sendOtp, verifyOtp } =
    useUser();
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_EMAIL || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

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
          <h1 className="text-[#36364c] text-[24px] font-bold text-center">
            OTP Login
          </h1>

          {/* Email Input */}
          <div className="bg-[#ffffff] box-border content-stretch flex flex-row items-start justify-start p-[12px] relative rounded-[1px] shrink-0 w-full">
            <div className="absolute border border-solid border-zinc-200 inset-0 pointer-events-none rounded-[1px]" />
            <div className="basis-0 box-border content-stretch flex flex-row gap-2 grow items-center justify-start min-h-px min-w-px overflow-clip p-0 relative self-stretch shrink-0">
              <div className="overflow-clip relative shrink-0 size-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c7c99"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex flex-col font-['Inter'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#7c7c99] text-[14px] text-left w-full bg-transparent border-none outline-none placeholder:text-[#7c7c99]"
              />
            </div>
          </div>

          {/* Send OTP Button */}
          {!otpSent ? (
            <button
              onClick={async () => {
                await sendOtp(email);
                setOtpSent(true);
              }}
              disabled={!email || !email.includes('@')}
              className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_6px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                Send OTP
              </span>
            </button>
          ) : (
            <>
              {/* OTP Input */}
              <div className="bg-[#ffffff] box-border content-stretch flex flex-row items-start justify-start p-[12px] relative rounded-[1px] shrink-0 w-full">
                <div className="absolute border border-solid border-zinc-200 inset-0 pointer-events-none rounded-[1px]" />
                <div className="basis-0 box-border content-stretch flex flex-row gap-2 grow items-center justify-start min-h-px min-w-px overflow-clip p-0 relative self-stretch shrink-0">
                  <div className="overflow-clip relative shrink-0 size-4">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c7c99"
                      strokeWidth="2"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    className="flex flex-col font-['Inter'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#7c7c99] text-[14px] text-left w-full bg-transparent border-none outline-none placeholder:text-[#7c7c99]"
                  />
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                onClick={async () => {
                  await verifyOtp(email, otp);
                }}
                disabled={!otp || otp.length !== 6}
                className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_6px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                  Verify OTP
                </span>
              </button>

              {/* Resend OTP Button */}
              <button
                onClick={async () => {
                  await sendOtp(email);
                }}
                className="bg-white flex flex-row gap-2 items-center justify-center p-[12px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_2px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold text-[#36364c] text-[14px] text-center tracking-[-0.1px] leading-none">
                  Resend OTP
                </span>
              </button>

              {/* Back Button */}
              <button
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
                className="font-bold text-[#1b6fae] text-[14px] text-center tracking-[-0.1px] w-full leading-none hover:underline"
              >
                Back to email
              </button>
            </>
          )}

          {error && hasInitialized && (
            <div className="text-red-500 text-[14px]">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
