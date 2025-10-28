'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Link from 'next/link';
import Image from 'next/image';
import KeyIllustration from '@/images/key-illustration.png';

export const RequiresAuthContent = ({
  message,
  onSkip,
  asModal,
}: {
  message: string;
  onSkip?: () => void;
  asModal?: boolean;
}) => {
  return (
    <div
      className={`flex items-center justify-center px-4 w-full ${
        asModal ? 'h-full' : 'flex-1'
      }`}
      style={{
        background:
          'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
      }}
    >
      <div className="max-w-[560px] min-w-[320px] w-full mx-auto my-8">
        <div className="flex flex-col gap-4 items-center justify-center px-4 py-6">
          {/* Key illustration */}
          <div className="relative h-[169px] w-[297px] shrink-0">
            <Image
              src={KeyIllustration}
              alt="Sign in required"
              fill
              className="object-cover object-center"
              priority
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4 items-center w-full">
            <h2 className="font-bold text-2xl text-[#20202b] text-center tracking-[-0.1px] leading-[1.2] w-full">
              Sign in required
            </h2>
            <div className="flex flex-col gap-3 items-start w-full">
              <p className="font-normal text-base text-[#353548] text-center tracking-[-0.1px] leading-[1.3] w-full">
                {message || 'To access this page, sign in to your account.'}
              </p>
            </div>

            {/* Sign in button */}
            <Link href="/onboarding?noLoading=true" className="w-full">
              <button className="bg-[#0073de] w-full flex gap-2 items-center justify-center px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#005493] cursor-pointer hover:bg-[#0060c0] transition-colors">
                <span className="font-bold text-base text-center text-white">
                  Sign in
                </span>
              </button>
            </Link>

            {onSkip && (
              <button
                onClick={onSkip}
                className="text-[#0073de] text-sm font-medium underline cursor-pointer"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthModal = ({
  onClose,
  message,
}: {
  onClose: () => void;
  message: string;
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[9999999999999999] flex items-center justify-center"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="my-16 mx-8">
        <RequiresAuthContent message={message} onSkip={onClose} asModal />
      </div>
    </div>
  );
};

export const requireAuth = (
  message: string = 'You need to be authenticated to perform this action.'
) => {
  // Create a container div for the modal
  const modalContainer = document.createElement('div');
  modalContainer.id = 'requires-auth-modal-root';
  document.body.appendChild(modalContainer);

  // Create a React root and render the modal
  const root = createRoot(modalContainer);

  const handleClose = () => {
    root.unmount();
    document.body.removeChild(modalContainer);
  };

  root.render(<AuthModal onClose={handleClose} message={message} />);
};
