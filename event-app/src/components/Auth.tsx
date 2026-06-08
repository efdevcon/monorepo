"use client";

import { useEffect, useState } from "react";
import cn from "classnames";
import { useUser } from "@/data/auth/useUser";
import { useRouter } from "@/routing";
import { useLoginTransition } from "./LoginTransition";
import { InstallAppButton } from "./InstallAppButton";
import { OtpInput } from "./OtpInput";

const RESEND_COOLDOWN = 30;

/**
 * Login screen modeled on the devcon-app design: a two-column layout with the
 * form on the left and a purple hero backdrop on the right (stacked on mobile).
 * Backed by the Supabase email-OTP flow in `useUser`.
 * When `onSkip` is provided, a "Skip for now" option is shown on the email step.
 * When `leaving` is true, the content fades out (login → app transition).
 */
export function Auth({
  onSkip,
  leaving = false,
}: { onSkip?: () => void; leaving?: boolean } = {}) {
  const { user, loading, hasInitialized, sendOtp, verifyOtp, signOut } =
    useUser();
  const router = useRouter();
  const { play } = useLoginTransition();
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

  if (!hasInitialized) {
    return (
      <Shell>
        <p className="text-gray-500">Loading…</p>
      </Shell>
    );
  }

  if (user && !leaving) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-1">You&apos;re signed in</h1>
        <p className="text-[#939393] mb-8">{user.email}</p>
        <PrimaryButton onClick={() => router.push("/")} disabled={busy}>
          Continue to app
        </PrimaryButton>
        <button
          onClick={signOut}
          disabled={busy}
          className="mt-3 w-full cursor-pointer rounded-full border border-[#E1E4EA] py-3 px-5 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? loading : "Sign out"}
        </button>
      </Shell>
    );
  }

  const sendCode = async () => {
    if (busy || !email) return;
    const sent = await sendOtp(email);
    if (!sent) return;
    setCodeSent(true);
    setCooldown(RESEND_COOLDOWN);
  };

  const verify = async () => {
    if (busy || code.length < 6) return;
    const ok = await verifyOtp(email, code);
    if (ok) play();
  };

  return (
    <Shell leaving={leaving}>
      {!codeSent ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login/devcon-8-logo.svg"
            alt="Devcon 8 India"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold mb-1 text-left">Sign in</h1>
          <p className="text-[#939393] mb-6 text-left">
            We&apos;ll email you a one-time code. If it&apos;s your first time,
            we&apos;ll create an account automatically.
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

          {onSkip && (
            <>
              <Divider />
              <button
                type="button"
                disabled={busy}
                onClick={onSkip}
                className="w-full rounded-full border border-[#E1E4EA] py-3 px-5 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login/devcon-8-logo.svg"
            alt="Devcon 8 India"
            className="h-16 mx-auto mb-6"
          />
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
    </Shell>
  );
}

/** Two-column shell: form column (children) + hero image on the right. */
function Shell({
  children,
  leaving = false,
}: {
  children: React.ReactNode;
  leaving?: boolean;
}) {
  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* Form — centered on mobile, left side on desktop */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-8">
          <div
            className={cn(
              "w-full max-w-sm mx-auto lg:mr-0 text-center transition-all duration-500",
              leaving && "opacity-0 scale-95"
            )}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Desktop only: a FULL-SCREEN image (200% of this 50vw panel) centered
          within the panel — so the panel shows the *center* of the image, not
          its right edge. This matches the transition overlay's offset start
          (translateX +25vw), so the grow-to-fill is seamless and centered. */}
      <div className="relative hidden lg:block order-last lg:w-1/2 bg-[#3D00BF] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login/backdrop.jpg"
          alt=""
          className="absolute top-0 left-1/2 h-full w-[200%] max-w-none -translate-x-1/2 object-cover"
        />
      </div>
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
