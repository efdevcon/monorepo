'use client';
import { SerwistProvider as BaseSerwistProvider } from '@serwist/turbopack/react';
import type { SerwistProviderProps } from '@serwist/turbopack/react';

export function SerwistProvider(props: SerwistProviderProps) {
  // Only enable service worker in production
  if (process.env.NODE_ENV !== 'production') {
    return <>{props.children}</>;
  }

  return <BaseSerwistProvider {...props} />;
}
