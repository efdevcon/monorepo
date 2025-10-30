'use client';
import React from 'react';
import { Separator } from 'lib/components/ui/separator';
import cn from 'classnames';
import { hasBetaAccess } from '@/utils/cookies';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiMicrophoneVariant } from '@mdi/js';
import { MapPinIcon as MapIcon } from 'lucide-react';

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
    <div className="flex flex-col w-full px-6 py-4">
      <h1 className="text-lg font-semibold mb-4">All Stages</h1>

      {/* Yellow Pavilion */}
      <div className="mb-6">
        <div className="inline-block bg-[rgba(246,180,14,1)] font-semibold p-1 text-sm px-2 rounded-xs mb-2">
          Yellow Pavilion
        </div>
        <div>
          {stages.yellowPavilion.map((stage, index) => {
            return (
              <>
                {renderStageRow(stage)}
                {index !== stages.yellowPavilion.length - 1 && (
                  <Separator className="my-2 grow w-auto" />
                )}
              </>
            );
          })}
        </div>
      </div>

      {/* Green Pavilion */}
      <div className="mb-6">
        <div className="inline-block bg-[rgba(56,142,48,1)] font-semibold p-1 text-sm px-2 rounded-xs mb-2 text-white">
          Green Pavilion
        </div>
        <div>
          {stages.greenPavilion.map((stage, index) => {
            return (
              <>
                {renderStageRow(stage)}
                {index !== stages.greenPavilion.length - 1 && (
                  <Separator className="my-2 grow w-auto" />
                )}
              </>
            );
          })}
        </div>
      </div>

      {/* Red Pavilion */}
      <div className="mb-6">
        <div className="inline-block bg-[rgba(229,30,84,1)] font-semibold p-1 text-sm px-2 rounded-xs mb-2 text-white">
          Red Pavilion
        </div>
        <div>
          {stages.redPavilion.map((stage, index) => {
            return (
              <>
                {renderStageRow(stage)}
                {index !== stages.redPavilion.length - 1 && (
                  <Separator className="my-2 grow w-auto" />
                )}
              </>
            );
          })}
        </div>
      </div>

      {/* Music */}
      <div className="mb-6">
        <div className="inline-block bg-[rgba(23,71,149,1)] font-semibold p-1 text-sm px-2 rounded-xs mb-2 text-white">
          Music
        </div>
        <div>
          {stages.music.map((stage, index) => {
            return (
              <>
                {renderStageRow(stage)}
                {index !== stages.music.length - 1 && (
                  <Separator className="my-2 grow w-auto" />
                )}
              </>
            );
          })}
        </div>
      </div>

      {/* Entertainment */}
      <div className="mb-6">
        <div className="inline-block bg-[rgba(232,131,1,1)] font-semibold p-1 text-sm px-2 rounded-xs mb-2">
          Entertainment
        </div>
        <div>
          {stages.entertainment.map((stage, index) => {
            return (
              <>
                {renderStageRow(stage)}
                {index !== stages.entertainment.length - 1 && (
                  <Separator className="my-2 grow w-auto" />
                )}
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StagesPage;
