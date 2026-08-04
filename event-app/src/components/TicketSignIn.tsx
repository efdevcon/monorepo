"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/data/auth/useUser";
import { InstallAppButton } from "./InstallAppButton";
import { OtpInput } from "./OtpInput";

const RESEND_COOLDOWN = 30;

/**
 * Inline email-OTP sign-in form for the ticket page. Backed by the Supabase
 * flow in `useUser` — the page's own `useUser()` call picks up the new
 * session via Supabase's auth listener once verification succeeds, so this
 * form doesn't need to report back explicitly.
 */
export function TicketSignIn() {
  const { loading, sendOtp, verifyOtp } = useUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const busy = loading !== false;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    if (busy || !email) return;
    const sent = await sendOtp(email);
    if (!sent) return;
    setCodeSent(true);
    setCooldown(RESEND_COOLDOWN);
  };

  const verify = async () => {
    if (busy || code.length < 6) return;
    await verifyOtp(email, code);
  };

  return (
    <div className="mx-auto w-full max-w-sm py-6 text-center">
      {!codeSent ? (
        <>
          <h1 className="text-2xl font-bold mb-1">
            Sign in to load your tickets
          </h1>
          <p className="text-[#939393] mb-6">
            Enter the email you used to buy your ticket — we&apos;ll send you
            a one-time code.
          </p>

          <label className="font-semibold text-sm">Email</label>
          <div className="relative mt-2 mb-4 rounded-xl border border-[#E1E4EA] overflow-hidden">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <MailIcon />
            </div>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
              placeholder="you@example.com"
              className="w-full pl-10 pr-3 py-3 border-none outline-none"
            />
          </div>

          <PrimaryButton onClick={sendCode} disabled={busy}>
            {busy ? loading : "Continue with email"}
          </PrimaryButton>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-1">Enter verification code</h1>
          <p className="text-[#939393] mb-6">
            We sent a code to <span className="font-medium">{email}</span>.
          </p>

          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={verify}
            autoFocus
          />

          <div className="mt-6">
            <PrimaryButton onClick={verify} disabled={busy || code.length < 6}>
              {busy ? loading : "Verify"}
            </PrimaryButton>
          </div>

          <Divider />

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={sendCode}
              className={
                cooldown > 0
                  ? "text-gray-400"
                  : "font-semibold underline cursor-pointer disabled:opacity-50"
              }
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCodeSent(false);
                setCode("");
              }}
              className="text-[#939393] hover:text-gray-700"
            >
              Use a different email
            </button>
          </div>
        </>
      )}

      {/* Install-as-app (mobile web only) */}
      <div className="mt-6 flex justify-center">
        <InstallAppButton />
      </div>

      <Footer />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-[#7D52F4] py-3 px-5 font-medium text-white transition-colors hover:bg-[#6A3FD1] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 my-5">
      <span className="h-px flex-1 bg-[#E1E4EA]" />
      <span className="text-xs text-[#939393]">OR</span>
      <span className="h-px flex-1 bg-[#E1E4EA]" />
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-10 text-xs text-[#939393]">
      <p>You retain full ownership over your data.</p>
      <div className="flex justify-center gap-4 mt-2 text-[#7D52F4]">
        <a
          href="https://ethereum.org/en/privacy-policy/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Privacy Policy
        </a>
        <a
          href="https://ethereum.org/en/terms-of-use/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Terms of Use
        </a>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
