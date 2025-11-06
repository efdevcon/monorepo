'use client';
import React from 'react';
import { Separator } from 'lib/components/ui/separator';
import { hasBetaAccess } from '@/utils/cookies';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiMicrophoneVariant } from '@mdi/js';
import { MapPinIcon as MapIcon } from 'lucide-react';
import useSWR from 'swr';
import { StageBadge } from '@/components/StageBadge';

const stages = {
  yellowPavilion: [
    { id: 'xl-stage', name: 'XL Stage', hasMap: true, hasInfo: true },
    { id: 'l-stage-yellow', name: 'L Stage', hasMap: true, hasInfo: true },
    { id: 'm2-stage', name: 'M2 Stage', hasMap: true, hasInfo: true },
    { id: 'm1-stage', name: 'M1 Stage', hasMap: true, hasInfo: true },
    { id: 'xs-stage', name: 'XS Stage', hasMap: true, hasInfo: true },
  ],
  greenPavilion: [
    {
      id: 'lightning-stage',
      name: 'Lightning Stage',
      hasMap: true,
      hasInfo: true,
    },
  ],
  redPavilion: [
    { id: 'l-stage-red', name: 'L Stage', hasMap: true, hasInfo: true },
    { id: 'nogal-hall', name: 'Nogal Hall', hasMap: true, hasInfo: true },
    { id: 'ceibo-hall', name: 'Ceibo Hall', hasMap: true, hasInfo: true },
  ],
  music: [
    { id: 'music-stage', name: 'Music Stage', hasMap: true, hasInfo: true },
  ],
  entertainment: [
    {
      id: 'open-air-cinema',
      name: 'Open Air Cinema',
      hasMap: true,
      hasInfo: true,
    },
  ],
};

const StagesPage = () => {
  const isBetaMode = hasBetaAccess();

  if (isBetaMode) {
    return <ComingSoonMessage />;
  }

  const { data: programming } = useSWR(
    'https://devconnect.pblvrt.com/schedules',
    fetch
  );

  // console.log(programming, 'programming ay');

  const renderStageRow = (stage: {
    id: string;
    name: string;
    hasMap: boolean;
    hasInfo: boolean;
  }) => (
    <div key={stage.id} className="flex items-center justify-between py-1">
      <h3 className="text-sm font-bold">{stage.name}</h3>
      <div className="flex gap-4 text-sm mr-4">
        {stage.hasMap && (
          <Link
            href={`/map?filter=${stage.id}`}
            className="flex items-center gap-2"
          >
            <span className="">
              <MapIcon className="w-4 h-4" />
            </span>
            <span className="font-medium">Map</span>
          </Link>
        )}
        {stage.hasInfo && (
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

  return (
    <div className="flex flex-col w-full px-6 py-4 gradient-background">
      <h1 className="text-lg font-semibold mb-4">All Stages</h1>

      {/* Yellow Pavilion */}
      <div className="mb-6">
        <StageBadge type="yellow" label="Yellow Pavilion" />
        <div>
          {stages.yellowPavilion.map((stage, index) => {
            return (
              <React.Fragment key={index}>
                {renderStageRow(stage)}
                {/* {index !== stages.yellowPavilion.length - 1 && ( */}
                <Separator className="my-2 grow w-auto" />
                {/* )} */}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Green Pavilion */}
      <div className="mb-6">
        <StageBadge type="green" label="Green Pavilion" />
        <div>
          {stages.greenPavilion.map((stage, index) => {
            return (
              <React.Fragment key={index}>
                {renderStageRow(stage)}

                <Separator className="my-2 grow w-auto" />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Red Pavilion */}
      <div className="mb-6">
        <StageBadge type="red" label="Red Pavilion" />
        <div>
          {stages.redPavilion.map((stage, index) => {
            return (
              <React.Fragment key={index}>
                {renderStageRow(stage)}

                <Separator className="my-2 grow w-auto" />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Music */}
      <div className="mb-6">
        <StageBadge type="music" label="Music" />
        <div>
          {stages.music.map((stage, index) => {
            return (
              <React.Fragment key={index}>
                {renderStageRow(stage)}

                <Separator className="my-2 grow w-auto" />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Entertainment */}
      <div className="mb-6">
        <StageBadge type="entertainment" label="Entertainment" />
        <div>
          {stages.entertainment.map((stage, index) => {
            return (
              <React.Fragment key={index}>
                {renderStageRow(stage)}

                <Separator className="my-2 grow w-auto" />
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StagesPage;
