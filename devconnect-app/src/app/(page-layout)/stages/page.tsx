'use client';
import React from 'react';
import { Separator } from 'lib/components/ui/separator';
import { hasEarlyAccess } from '@/utils/cookies';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiMicrophoneVariant } from '@mdi/js';
import { MapPinIcon as MapIcon } from 'lucide-react';
import { StageBadge } from '@/components/StageBadge';
import { useAllStages } from '@/app/store.hooks';

const StagesPage = () => {
  const { pavilions } = useAllStages();
  const hasEarlyAccessCookie = hasEarlyAccess();

  if (!hasEarlyAccessCookie) {
    return <ComingSoonMessage />;
  }

  const renderStageRow = (stage: {
    id: string;
    name: string;
    mapUrl?: string;
    apiSourceId?: string;
  }) => {
    // Show info link if the stage has an apiSourceId (meaning it came from the API)
    const hasInfo = !!stage.apiSourceId;

    return (
      <div key={stage.id} className="flex items-center justify-between py-1">
        <h3 className="text-sm font-bold">{stage.name}</h3>
        <div className="flex gap-4 text-sm mr-4 text-[#0073de]">
          {stage.mapUrl && (
            <Link href={stage.mapUrl} className="flex items-center gap-2">
              <span className="">
                <MapIcon className="w-4 h-4" />
              </span>
              <span className="font-medium">Location</span>
            </Link>
          )}
          {hasInfo && (
            <Link
              href={`/stages/${stage.id}`}
              className="flex items-center text-sm gap-1.5"
            >
              <span className=" ">
                <Icon path={mdiMicrophoneVariant} size={0.7} />
              </span>
              <span className="font-medium">Info</span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  const renderPavilion = (
    type: 'yellow' | 'green' | 'red' | 'music' | 'entertainment',
    label: string,
    pavilionStages: Array<{
      id: string;
      name: string;
      mapUrl: string;
      apiSourceId: string;
    }>
  ) => {
    if (!pavilionStages || pavilionStages.length === 0) return null;

    return (
      <div className="mb-6">
        <StageBadge type={type} label={label} />
        <div className="mt-2">
          {pavilionStages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              {renderStageRow(stage)}
              <Separator className="my-2 grow w-auto" />
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full px-6 py-4 pt-6 gradient-background grow">
      {/* <h1 className="text-lg font-semibold mb-4">All Stages</h1> */}

      {renderPavilion('yellow', 'Yellow Pavilion', pavilions.yellowPavilion)}
      {renderPavilion('green', 'Green Pavilion', pavilions.greenPavilion)}
      {renderPavilion('red', 'Red Pavilion', pavilions.redPavilion)}
      {renderPavilion('music', 'Music', pavilions.music)}
      {renderPavilion(
        'entertainment',
        'Entertainment',
        pavilions.entertainment
      )}
    </div>
  );
};

export default StagesPage;
