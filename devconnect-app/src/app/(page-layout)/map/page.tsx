'use client';
import PageLayout from '@/components/PageLayout';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { VenueMap } from './venue-map/VenueMap';
import { hasEarlyAccess } from '@/utils/cookies';
import React from 'react';

export default function MapPage() {
  // Check if early access is enabled
  const hasEarlyAccessCookie = hasEarlyAccess();

  // Show coming soon message if early access is not enabled
  if (!hasEarlyAccessCookie) {
    return (
      // <PageLayout title="La Rural - Venue Map">
      <ComingSoonMessage />
      // </PageLayout>
    );
  }

  return (
    // <PageLayout title="La Rural - Venue Map">
    <React.Suspense fallback={<div>Loading...</div>}>
      <VenueMap />
    </React.Suspense>
    // </PageLayout>
  );
}
