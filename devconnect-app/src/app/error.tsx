'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { openReportIssue } from '@/utils/reportIssue';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              We encountered an unexpected error. Don&apos;t worry, you can try
              refreshing the page to continue.
            </p>
          </div>

          {/* Error Details (only in development) */}
          <div className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-xs text-left text-gray-700 dark:text-gray-300 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-left text-gray-500 dark:text-gray-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* <Button
              onClick={() => reset()}
              className="flex-1"
              size="lg"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button> */}
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 cursor-pointer p-2"
              size="lg"
            >
              Refresh Page
            </Button>
          </div>

          {/* Additional Help */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>
              If the problem persists,{' '}
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                go back to home
              </button>{' '}
              or{' '}
              <button
                onClick={openReportIssue}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                report this issue
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

