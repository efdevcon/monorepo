'use client';
import PageLayout from '@/components/PageLayout';
import { VenueMap } from './venue-map/VenueMap';
import React from 'react';

export default function MapPage() {
  return (
    <PageLayout title="Map">
      <React.Suspense fallback={<div>Loading...</div>}>
        <VenueMap />
      </React.Suspense>
    </PageLayout>
  );
}
