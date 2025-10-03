'use client';

import React from 'react';
import Button from 'lib/components/voxel-button/button';
import { createRoot } from 'react-dom/client';
import Link from 'next/link';
import Offline from '@/images/state/offline.png';
import Image from 'next/image';

export const RequiresAuthContent = ({
  message,
  onSkip,
}: {
  message: string;
  onSkip?: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4 my-16">
      <div className="bg-white p-5 shadow-xl max-w-md w-full mx-4 flex flex-col relative">
        <h2 className="text-lg font-bold mb-1">Authentication Required</h2>
        <p className="mb-4 max-w-[70%]">{message}</p>

        <div className="flex gap-2 items-end">
          <Link href="/onboarding">
            <Button size="sm" color="green-1">
              Sign in
            </Button>
          </Link>

          {onSkip && (
            <Button onClick={onSkip} size="sm" color="blue-1">
              Skip
            </Button>
          )}
        </div>

        <Image
          src={Offline}
          alt="Offline"
          className="w-[50%] sm:w-[30%] shrink-0 self-center mb-4 absolute bottom-0 right-4"
        />
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
      <div onClick={(e) => e.stopPropagation()}>
        <RequiresAuthContent message={message} onSkip={onClose} />
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
