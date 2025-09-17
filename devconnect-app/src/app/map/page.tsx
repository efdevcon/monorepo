'use client';
import PageLayout from '@/components/PageLayout';
import { VenueMap } from './venue-map/VenueMap2';
import { Suspense } from 'react';

export default function MapPage() {
  return (
    <PageLayout title="Map">
      <Suspense fallback={<div>Loading...</div>}>
        <VenueMap />
      </Suspense>
    </PageLayout>
  );
}
