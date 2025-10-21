'use client';
import PageLayout from '@/components/PageLayout';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { VenueMap } from './venue-map/VenueMap';
import React from 'react';

export default function MapPage() {
  // Check if beta mode is enabled
  const isBetaMode = process.env.NEXT_PUBLIC_BETA === 'true';

  // Show coming soon message if beta mode is enabled
  if (isBetaMode) {
    return (
      <PageLayout title="La Rural">
        <ComingSoonMessage />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="La Rural">
      <React.Suspense fallback={<div>Loading...</div>}>
        <VenueMap />
      </React.Suspense>
    </PageLayout>
  );
}
