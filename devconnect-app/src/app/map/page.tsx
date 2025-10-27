'use client';
import PageLayout from '@/components/PageLayout';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { VenueMap } from './venue-map/VenueMap';
import { hasBetaAccess } from '@/utils/cookies';
import React from 'react';

export default function MapPage() {
  // Check if beta mode is enabled (hide for beta users)
  const isBetaMode = hasBetaAccess();

  // Show coming soon message if beta mode is enabled
  if (isBetaMode) {
    return (
      <PageLayout title="La Rural - Venue Map">
        <ComingSoonMessage />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="La Rural - Venue Map">
      <React.Suspense fallback={<div>Loading...</div>}>
        <VenueMap />
      </React.Suspense>
    </PageLayout>
  );
}
