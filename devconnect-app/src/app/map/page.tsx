'use client';
import PageLayout from '@/components/PageLayout';
import { VenueMap } from './venue-map/VenueMap2';

export default function MapPage() {
  return (
    <PageLayout title="Map">
      <VenueMap />
    </PageLayout>
  );
}
