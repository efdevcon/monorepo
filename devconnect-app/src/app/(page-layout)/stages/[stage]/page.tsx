'use client';

import Link from 'next/link';
import Button from 'lib/components/voxel-button/button';

export default function StagePage() {
  return (
    <div className="flex flex-col w-full px-6 py-4 pt-6 gradient-background grow items-center justify-center">
      <Link
        href="https://devconnect.org/#videos"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button size="sm" className="font-medium px-6" color="blue-2">
          Watch Recordings
        </Button>
      </Link>
    </div>
  );
}
