'use client';

import { useEffect } from 'react';
import { openReportIssue } from '@/utils/reportIssue';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
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
                  Critical Error
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  We encountered a critical error. Please refresh the page to
                  continue.
                </p>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && (
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
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => reset()}
                  className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-6 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
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
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-6 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  Refresh Page
                </button>
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

        {/* Inline styles for basic styling when CSS might not load */}
        <style jsx>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family:
              -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
              'Helvetica Neue', Arial, sans-serif;
          }
        `}</style>
      </body>
    </html>
  );
}

