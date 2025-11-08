'use client';

import type { Metadata } from 'next';
import { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import {
  mdiWifiOff,
  mdiRefresh,
  mdiCheckCircle,
  mdiCloseCircle,
  mdiInformation,
} from '@mdi/js';
import cn from 'classnames';

// Recommendation 4: Enhanced offline page with retry, network status, and helpful info
export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);
    setLastChecked(new Date());

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection status every 5 seconds
    const interval = setInterval(() => {
      setIsOnline(navigator.onLine);
      setLastChecked(new Date());
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setLastChecked(new Date());

    try {
      // Try to fetch the home page to verify connection
      const response = await fetch('/', { cache: 'no-store' });

      if (response.ok) {
        // Connection restored, redirect to home
        window.location.href = '/';
      } else {
        setIsRetrying(false);
      }
    } catch (error) {
      // Still offline
      setIsRetrying(false);
      setIsOnline(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Unknown';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-background">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8">
        {/* Icon and Status */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Icon path={mdiWifiOff} size={2} className="text-gray-400" />
          </div>

          <h1 className="text-2xl font-bold text-[#20202b] mb-2">
            You're Offline
          </h1>

          <p className="text-[#4b4b66] text-sm">
            It looks like you've lost your internet connection
          </p>
        </div>

        {/* Network Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#353548]">
              Network Status
            </span>
            <div className="flex items-center gap-2">
              <Icon
                path={isOnline ? mdiCheckCircle : mdiCloseCircle}
                size={0.7}
                className={cn(isOnline ? 'text-green-500' : 'text-red-500')}
              />
              <span
                className={cn(
                  'text-xs font-semibold',
                  isOnline ? 'text-green-700' : 'text-red-700'
                )}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {lastChecked && (
            <p className="text-xs text-[#4b4b66]">
              Last checked: {formatTime(lastChecked)}
            </p>
          )}
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying || !isOnline}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[1px] font-bold text-base transition-all mb-6',
            isOnline && !isRetrying
              ? 'bg-[#0073de] text-white shadow-[0px_4px_0px_0px_#005493] hover:bg-[#0060c0] cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          <Icon
            path={mdiRefresh}
            size={0.8}
            className={cn(isRetrying && 'animate-spin')}
          />
          {isRetrying
            ? 'Retrying...'
            : isOnline
              ? 'Try Again'
              : 'Waiting for Connection...'}
        </button>

        {/* Tips */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-start gap-2 mb-3">
            <Icon
              path={mdiInformation}
              size={0.7}
              className="text-[#0073de] mt-0.5"
            />
            <div>
              <h3 className="text-sm font-semibold text-[#353548] mb-2">
                Helpful Tips:
              </h3>
              <ul className="space-y-2 text-xs text-[#4b4b66]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Check your WiFi or mobile data connection</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Try turning airplane mode off</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Move to an area with better signal</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Some cached pages may still be available</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Auto-retry notification */}
        {isOnline && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800 text-center">
              ✅ Connection restored! Click "Try Again" to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
