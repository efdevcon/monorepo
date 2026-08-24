"use client";

import { useEffect, useState } from "react";
import cn from "classnames";
import { useUser } from "@/data/auth/useUser";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { PrimaryButton } from "./Buttons";
import { InstallAppButton } from "./InstallAppButton";
import { OtpInput } from "./OtpInput";

const RESEND_COOLDOWN = 30;

/** Standard something@mail.com shape — gates the UI only, not the OTP flow. */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Inline email-OTP sign-in card for the ticket page (Figma "Sign in to the
 * Devcon app" / "Enter verification code"). Backed by the Supabase flow in
 * `useUser` — the page's own `useUser()` call picks up the new session via
 * Supabase's auth listener once verification succeeds, so this form doesn't
 * need to report back explicitly.
 */
export function TicketSignIn() {
  const { loading, sendOtp, verifyOtp } = useUser();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // JS gate (not just CSS hiding) so mobile never downloads the key art PNG.
  const isDesktop = useIsDesktop();

  const busy = loading !== false;
  // Trimmed: addresses copied out of a confirmation email (or via an iOS
  // long-press) routinely carry a trailing space or newline, which
  // EMAIL_FORMAT rejects — the CTA then stayed disabled forever on a field
  // that looked perfectly correct.
  const cleanEmail = email.trim();
  const emailValid = EMAIL_FORMAT.test(cleanEmail);
  // Only complain once the user has left the field — not mid-typing.
  const showEmailError = emailTouched && email.length > 0 && !emailValid;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    if (busy) return;
    // Surface the problem instead of doing nothing: pressing Enter on an
    // invalid address used to return here silently, with no error, no border
    // and no toast (and the disabled CTA can't even blur the field).
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    const sent = await sendOtp(cleanEmail);
    if (!sent) return;
    setCodeSent(true);
    setCode("");
    setCodeError(false);
    setCooldown(RESEND_COOLDOWN);
  };

  // Takes the value as an argument because OtpInput's onComplete fires in the
  // same render as the final onChange — `code` state would still be stale.
  const verify = async (value = code) => {
    if (busy || value.length < 6) return;
    const ok = await verifyOtp(cleanEmail, value);
    if (!ok) setCodeError(true);
  };

  return (
    <div className="relative flex w-full flex-col items-center gap-6 overflow-clip rounded-xl border border-dc-hairline bg-white px-4 py-16 font-heading lg:p-16">
      {/* Desktop-only side decoration: glyph-masked key art, half overhanging
          each card edge (the card clips it, so each side reveals the
          opposite half). */}
      {isDesktop && (
        <>
          <SideArt id="signin-art-left" className="left-[-160px]" />
          <SideArt id="signin-art-right" className="right-[-161px]" />
        </>
      )}
      {/* Same artwork as the desktop header logo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/schedule/devcon8-logo.svg"
        alt="Devcon 8 India"
        className="h-16 w-auto"
      />

      {!codeSent ? (
        <div className="flex w-full max-w-[460px] flex-col gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 text-center">
              <h1 className="text-[20px] font-extrabold leading-[26px] text-dc-fg2 lg:text-[24px] lg:leading-[28.8px] lg:tracking-[-0.5px]">
                Sign in to the Devcon app
              </h1>
              <p className="text-[16px] leading-6 text-dc-muted">
                Enter your ticket purchase email to add your tickets, take part
                in live Q&amp;A, and save your Interests cross-platform.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label
                htmlFor="signin-email"
                className="text-[16px] font-bold leading-6 text-dc-fg"
              >
                Email
                {showEmailError && <span className="text-dc-error">*</span>}
              </label>
              <input
                id="signin-email"
                type="email"
                aria-invalid={showEmailError}
                aria-describedby="signin-email-error"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Editing clears the complaint until the user leaves the
                  // field again — otherwise `emailTouched` stays true from the
                  // first blur and the error nags on every keystroke while
                  // they're busy correcting it (worst right after clearing the
                  // field to retype).
                  setEmailTouched(false);
                }}
                onBlur={() => setEmailTouched(true)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                placeholder="youremail@example.com"
                className={cn(
                  // Same shape as the speakers search input (rounded-xl pill).
                  "w-full rounded-xl border bg-white px-3 py-2.5 text-[16px] leading-6 text-dc-fg outline-none transition-colors duration-150 ease-out placeholder:text-dc-muted",
                  showEmailError
                    ? "border-dc-error-border"
                    : "border-dc-border focus:border-dc-purple"
                )}
              />
              {/* Always mounted, so appearing/disappearing can't change the
                  card's height (the message is one 20px line inside a gap-3
                  column, which used to add 32px). aria-live announces it when
                  it fills in. */}
              <p
                id="signin-email-error"
                className="min-h-5 text-[14px] leading-5 text-dc-error"
                aria-live="polite"
              >
                {showEmailError ? "Please enter a valid email format." : ""}
              </p>
            </div>

            <PrimaryButton
              className="min-h-12 w-full"
              onClick={sendCode}
              disabled={busy || !emailValid}
            >
              {busy ? loading : "Send one-time code"}
            </PrimaryButton>
          </div>

          <Footer />
        </div>
      ) : (
        <div className="flex w-full max-w-[460px] flex-col gap-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 text-center">
              <h1 className="text-[20px] font-extrabold leading-[26px] text-dc-fg2 lg:text-[24px] lg:leading-[28.8px] lg:tracking-[-0.5px]">
                Enter verification code
              </h1>
              <p className="text-[16px] leading-6 text-dc-muted">
                We sent a six-digit code to:{" "}
                <span className="font-bold">{cleanEmail}</span>
              </p>
            </div>

            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setCodeError(false);
              }}
              onComplete={(v) => verify(v)}
              autoFocus
              error={codeError}
              placeholder="123456"
            />

            <PrimaryButton
              className="min-h-12 w-full lg:max-w-[348px] lg:self-center"
              onClick={() => verify()}
              disabled={busy || code.length < 6}
            >
              {busy ? loading : "Confirm verification code"}
            </PrimaryButton>
          </div>

          <div className="h-px w-full bg-dc-hairline" />

          <div className="flex items-center justify-between text-[14px] leading-none">
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={sendCode}
              className={
                cooldown > 0
                  ? "text-dc-muted"
                  : "cursor-pointer font-bold text-dc-purple disabled:opacity-50"
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
                setCodeError(false);
              }}
              className="cursor-pointer text-dc-purple underline"
            >
              Use a different email
            </button>
          </div>

          <Footer />
        </div>
      )}

      {/* Install-as-app (mobile web only) — extra breathing room from the
          form above; empty:hidden stops the margin ghosting when it's null. */}
      <div className="mt-4 empty:hidden">
        <InstallAppButton />
      </div>
    </div>
  );
}

/**
 * One side of the sign-in card's key art (Figma "ALT - masked key art
 * style"): the glyph-masked artwork PNG with a Figma-spec inner shadow
 * (0 / 2 / blur 4, #221144 at 15%) on its alpha for the cut-out effect.
 * SVG filter because CSS has no inner shadow that follows image alpha.
 * `id` keeps the filter ids unique across the two instances.
 */
function SideArt({ id, className }: { id: string; className?: string }) {
  const filterId = `${id}-cutout`;
  return (
    <svg
      width="322"
      height="548"
      viewBox="0 0 322 548"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1/2 hidden h-[548px] w-[322px] -translate-y-1/2 lg:block",
        className
      )}
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          {/* Inner shadow: invert the art's alpha, blur+offset it, tint it,
              then keep only the part that falls back inside the art. */}
          <feComponentTransfer in="SourceAlpha" result="invert">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="invert" stdDeviation="2" result="blur" />
          <feOffset in="blur" dx="0" dy="2" result="offset" />
          <feFlood floodColor="#221144" floodOpacity="0.15" result="tint" />
          <feComposite in="tint" in2="offset" operator="in" result="shadow" />
          <feComposite in="shadow" in2="SourceAlpha" operator="in" result="inner" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="inner" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <image href="/login/signin-keyart.webp" width="322" height="548" />
      </g>
    </svg>
  );
}

function Footer() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-[14px] leading-5 text-dc-muted">
        You retain full ownership over your data
      </p>
      <div className="flex items-center justify-center gap-3 text-[14px] leading-none text-dc-purple">
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
