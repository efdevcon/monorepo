'use client';

import Image from 'next/image';
import Icon from '@mdi/react';
import { mdiAlertOutline } from '@mdi/js';
import { openReportIssue } from '@/utils/reportIssue';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 overflow-clip relative flex-1 gap-8"
      style={{
        backgroundImage:
          'linear-gradient(-8.90443e-07deg, rgba(246, 182, 19, 0.15) 0%, rgba(255, 133, 166, 0.15) 9.0741%, rgba(152, 148, 255, 0.15) 18.289%, rgba(116, 172, 223, 0.15) 42.138%, rgba(242, 249, 255, 0.15) 55.067%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      }}
    >
      {/* Logo at the top */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Image
          src="/images/devconnect-arg-logo.svg"
          alt="Devconnect ARG Logo"
          width={161}
          height={41}
          className="w-auto h-[41px]"
        />
      </div>

      <div
        className="w-full max-w-[560px] min-w-[320px] bg-white border border-solid box-border flex flex-col items-center justify-center"
        style={{
          borderColor: '#ededf0',
          borderRadius: '4px',
          width: 'min(353px, 100%)',
        }}
      >
        <div className="box-border flex flex-col gap-4 items-center justify-center p-6 w-full">
          {/* Error Icon */}
          <div
            className="flex items-center justify-center overflow-clip relative shrink-0"
            style={{
              backgroundColor: '#fff4e6',
              borderRadius: '360px',
              width: '88px',
              height: '88px',
            }}
          >
            <Icon path={mdiAlertOutline} size="40px" color="#F6B613" />
          </div>

          {/* Error Content */}
          <div className="flex flex-col gap-3 items-center w-full">
            <h1
              className="font-bold text-center tracking-[-0.1px] w-full"
              style={{
                color: '#20202b',
                fontSize: '24px',
                lineHeight: '1.2',
                fontFamily: 'var(--font-geist-sans, sans-serif)',
              }}
            >
              Page Not Found
            </h1>
            <div
              className="font-normal text-center tracking-[-0.1px] w-full"
              style={{
                color: '#353548',
                fontSize: '16px',
                lineHeight: '1.3',
                fontFamily: 'var(--font-geist-sans, sans-serif)',
              }}
            >
              <p className="mb-0">The page you're looking for doesn't exist.</p>
              <p>It may have been moved or deleted.</p>
            </div>

            {/* Error Details */}
            <div
              className="box-border flex gap-2 items-center justify-center p-4 w-full"
              style={{
                backgroundColor: '#fff4e6',
              }}
            >
              <p
                className="font-normal tracking-[-0.1px] break-words"
                style={{
                  color: '#353548',
                  fontSize: '14px',
                  lineHeight: '1.3',
                  fontFamily: 'var(--font-geist-mono, monospace)',
                }}
              >
                Error 404
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 items-start w-full">
              <Link
                href="/"
                className="w-full px-6 py-3 box-border flex gap-2 items-center justify-center font-bold text-white transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#0073de',
                  borderRadius: '1px',
                  boxShadow: '0px 4px 0px 0px #005493',
                  fontSize: '16px',
                  fontFamily: 'var(--font-geist-sans, sans-serif)',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                Go to Home
              </Link>
              <button
                onClick={openReportIssue}
                className="w-full px-6 py-3 box-border flex gap-2 items-center justify-center font-bold transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#eaf3fa',
                  color: '#44445d',
                  borderRadius: '1px',
                  boxShadow: '0px 4px 0px 0px #595978',
                  fontSize: '16px',
                  fontFamily: 'var(--font-geist-sans, sans-serif)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Report issue
              </button>
            </div>

            {/* Additional Help */}
            <p
              className="font-normal text-center tracking-[-0.1px] w-full"
              style={{
                color: '#4b4b66',
                fontSize: '14px',
                lineHeight: '1.3',
                fontFamily: 'var(--font-geist-sans, sans-serif)',
              }}
            >
              <span>Need help? </span>
              <button
                onClick={() => {
                  window.history.back();
                }}
                className="font-bold underline"
                style={{
                  color: '#0073de',
                  textUnderlinePosition: 'from-font',
                  textDecoration: 'underline solid',
                  fontFamily: 'var(--font-geist-sans, sans-serif)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Go back
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
