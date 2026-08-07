import FlexibleDrawer from 'lib/components/flexible-drawer';
import { Dispatch, SetStateAction, useMemo, useState, useEffect } from 'react';
import cn from 'classnames';
import { MapPin, XIcon, ArrowUpRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import X from './icons/x.svg';
import FarcasterIcon from './icons/farcaster.svg';
import Link from 'next/link';
import Image from 'next/image';
import Placeholder from './images/placeholder.png';
import { poisData } from '@/data/pois';
import { districtsData } from '@/data/districts';
import { poiGroupsData } from '@/data/poiGroups';
import { supportersData } from '@/data/supporters';
import { locationsData } from '@/data/locations';
import { District } from '@/types/api-data';
import { useRouter } from 'next/navigation';
import Icon from '@mdi/react';
import {
  mdiMicrophoneVariant,
  mdiFoodOutline,
  mdiCoffeeOutline,
  mdiHandshakeOutline,
  mdiTshirtCrew,
  mdiInformationOutline,
  mdiSoccer,
  mdiExportVariant,
} from '@mdi/js';

// Helper function to get stage color based on location/pavilion
const getStageColor = (
  locationId: string | null,
  layerName: string
): string | null => {
  // Map of stages that need special colors based on image
  const stageColorMap: Record<string, string> = {
    // Yellow Pavilion stages (locationId: 15)
    'xl-stage': 'rgba(246,180,14,1)', // Yellow/Gold
    'xs-stage': 'rgba(246,180,14,1)',
    'm1-stage': 'rgba(246,180,14,1)',
    'm2-stage': 'rgba(246,180,14,1)',
    'poi-buidIguidl-bootcamp': 'rgba(246,180,14,1)',
    bootcamp: 'rgba(246,180,14,1)',

    // Green Pavilion stages (locationId: 6)
    'lighting-talks-stage': '#388e31', // Green
    'lightning-stage': '#388e31',

    // Red Pavilion stages (locationId: 12)
    'l-stage': '#e61d54', // Red
    'nogal-hall': '#e61d54',
    'ceibo-hall': '#e61d54',

    // Blue Pavilion stages (locationId: 2)
    amphitheater: '#184795', // Blue
    'blue-pavilion': '#184795',

    // Entertainment/Music stages
    'music-stage_2': '#e98302', // Orange
    'open-air-cinema': '#e98302',
  };

  // First check if the layerName has a direct mapping
  if (stageColorMap[layerName]) {
    return stageColorMap[layerName];
  }

  // Fallback to location-based color mapping
  // if (locationId) {
  //   const locationColorMap: Record<string, string> = {
  //     '15': '#F5BC51', // Yellow Pavilion
  //     '6': '#388e31', // Green Pavilion
  //     '12': '#e61d54', // Red Pavilion
  //     '2': '#5B8ACF', // Blue Pavilion
  //     '1': '#5B8ACF', // Amphitheater
  //     '3': '#E97E46', // Entertainment
  //     '8': '#E97E46', // Music Stage
  //   };

  //   return locationColorMap[locationId] || null;
  // }

  return null;
};

// Helper function to get teal box icon based on POI category
const getTealBoxIcon = (
  groupId: string | null,
  layerName: string
): string | null => {
  if (!groupId) return null;

  // Map groupIds to icons
  const iconMap: Record<string, string> = {
    '7': mdiFoodOutline, // Food & Beverage
    // '14': mdiCoffeeOutline, // Power-up Station (Coffee)
    '9': mdiHandshakeOutline, // Meeting Rooms
    '6': mdiTshirtCrew, // SWAG station
    '10': mdiInformationOutline, // Onboarding Area
    '11': mdiInformationOutline, // Onboarding desk
    '5': mdiSoccer, // Entertainment (Futbol)
  };

  return iconMap[groupId] || null;
};

const Pane = ({
  children,
  className,
  paneOpen,
  selection,
  setSelection,
  displayName,
  description,
  subtitle,
  links,
  logo,
  districtBadge,
  districtData,
  backgroundColor,
  stageColor,
  isStage = false,
  tealBoxIcon,
  linkText,
}: {
  children?: React.ReactNode;
  className?: string;
  paneOpen: boolean;
  links?: Record<'website' | 'x' | 'farcaster', string>;
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
  displayName?: string;
  description?: string;
  subtitle?: string;
  logo?: string;
  districtBadge?: string;
  districtData?: District | null;
  backgroundColor?: string;
  stageColor?: string | null;
  isStage?: boolean;
  linkText?: string;
  tealBoxIcon?: string | null;
}) => {
  const imageSrc = logo || '';
  const router = useRouter();
  // Combine white overlay with district gradient
  const backgroundStyle = backgroundColor
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), ${backgroundColor}`,
      }
    : undefined;

  const LinkItems = (() => {
    if (!links) return null;

    // Check if any links have non-empty values
    const hasValidLinks = Object.values(links).some(
      (link) => link && link.trim() !== ''
    );
    if (!hasValidLinks) return null;

    return (
      <div className="flex flex-col gap-1 mt-4">
        {/* <p className="font-bold text-base text-[#20202B] leading-[1.5] tracking-[-0.1px]">
          Links
        </p> */}
        <div className="flex items-start gap-2">
          {links && links.website && links.website.trim() !== '' && (
            <Link
              href={isStage ? 'https://devconnect.org/#videos' : links.website}
              {...(isStage || links.website.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center gap-2 h-[40px] px-4 py-2 cursor-pointer">
                <span className="font-bold text-sm text-[#0073DE]">
                  {linkText || (isStage ? 'Watch Recordings' : 'Visit Website')}
                </span>
                <ArrowUpRightIcon className="w-4 h-4 shrink-0 text-[#0073DE]" />
              </button>
            </Link>
          )}
          {links && links.x && links.x.trim() !== '' && (
            <Link href={links.x} target="_blank" rel="noopener noreferrer">
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center p-2 size-[40px] cursor-pointer">
                <X className="!h-4 !w-auto shrink-0 icon" />
              </button>
            </Link>
          )}
          {links && links.farcaster && links.farcaster.trim() !== '' && (
            <Link
              href={links.farcaster}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center p-2 size-[40px] cursor-pointer">
                <FarcasterIcon className="!h-4 !w-auto shrink-0 icon" />
              </button>
            </Link>
          )}
        </div>
      </div>
    );
  })();

  const paneContent = (
    <div
      data-prevent-interaction-element="true"
      className="p-4"
      style={{
        ...backgroundStyle,
        // maxHeight: '66.67vh',
        paddingBottom: 'calc(16px + max(0px, env(safe-area-inset-bottom)))',
        contain: 'layout style paint',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex justify-between">
        <div className="flex items-center gap-3 self-start">
          {imageSrc ? (
            <div
              className={cn(
                'shrink-0 w-[44px] h-[44px] overflow-hidden flex items-center justify-center',
                districtBadge ? 'rounded-[4px]' : ''
              )}
            >
              <img
                src={imageSrc}
                alt={displayName || selection || ''}
                className="w-full h-full object-cover"
                loading="eager"
                width={44}
                height={44}
                style={{ contentVisibility: 'auto' }}
              />
            </div>
          ) : stageColor ? (
            <div
              className="shrink-0 w-[44px] h-[44px] rounded-[4px] flex items-center justify-center"
              style={{ backgroundColor: stageColor }}
            >
              <Icon
                path={mdiMicrophoneVariant}
                size={1.2}
                className="text-white"
              />
            </div>
          ) : tealBoxIcon ? (
            <div
              className="shrink-0 w-[44px] h-[44px] rounded-[4px] flex items-center justify-center"
              style={{ backgroundColor: '#4DB8AC' }}
            >
              <Icon path={tealBoxIcon} size={1.2} className="text-white" />
            </div>
          ) : (
            <Image
              src={Placeholder}
              alt={displayName || selection || ''}
              className="w-8 h-8 object-cover shrink-0"
              style={{ filter: 'brightness(0)' }}
            />
          )}

          <div className="flex flex-col gap-1 pr-2 justify-center">
            <div className="flex gap-1.5 items-center">
              <p className="font-bold text-[18px] leading-none text-[#20202B]">
                {displayName || selection}
              </p>
              {/* {districtBadge && (
                <div
                  className="border border-[#353548] px-1 py-0.5"
                  onClick={() => {
                    router.push(
                      '/map?filter=' +
                        encodeURIComponent(districtData?.layerName || '')
                    );
                  }}
                >
                  <p className="text-[10px] font-semibold text-[#353548] leading-[1.3] tracking-[0.2px]">
                    {districtBadge}
                  </p>
                </div>
              )} */}
            </div>
            {subtitle === 'TBD' || !subtitle ? null : (
              <div className="text-xs leading-tight">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center gap-1 cursor-pointer basic-button white-button small-button square-button"
            onClick={() => {
              console.log('copying location link', selection);
              try {
                navigator.clipboard.writeText(
                  window.location.origin +
                    '/map?filter=' +
                    encodeURIComponent(selection || '')
                );
              } catch (error) {
                alert('Error copying location link');
              }

              toast.success('Location link copied to clipboard', {
                duration: 5000,
              });
            }}
          >
            {/* Copy Location */}
            {/* <MapPin className="w-4 h-4 cursor-pointer" /> */}
            <Icon path={mdiExportVariant} size={0.7} className="text-black" />
          </button>
          <button
            onClick={() => setSelection(null)}
            className="flex items-center justify-center basic-button white-button small-button square-button shrink-0 cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {children}
      {description && (
        <div className="flex flex-col gap-1 leading-[1.5] mt-4">
          <p className="font-bold text-base text-[#20202B] tracking-[-0.1px]">
            About
          </p>
          <p
            className="text-sm text-[#353548] font-normal"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        </div>
      )}
      {LinkItems}
    </div>
  );

  return (
    <FlexibleDrawer
      open={paneOpen}
      onOpenChange={() => setSelection(null)}
      className={cn('p-0', className)}
      hideHandle={true}
    >
      {paneContent}
    </FlexibleDrawer>
  );
};

const MapPane = (props: {
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
}) => {
  const { selection, setSelection } = props;

  // Handle Escape key to close the pane
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selection) {
        setSelection(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selection, setSelection]);

  /*
    A selection 
      - has an id (group or district id or POI id)
      - is part of group or part of district
      - has description
      - has links
    if the selection is a group, then show resolve the pois which contain that group
    if the selection is a district, then show resolve the pois which contain that district
  */

  const paneOpen = !!selection;

  // Memoize the active pane to prevent recalculation on every render
  const ActivePane = useMemo(() => {
    if (!selection) {
      return null;
    }

    let selectionData:
      | {
          name: string;
          pane_type: 'poi' | 'district' | 'group' | 'fallback (no notion data)';
          [key: string]: any;
        }
      | undefined;

    const poiData = poisData.find((poi) => poi.layerName === selection);
    const supporterData = Object.values(supportersData).find(
      (supporter) => supporter.layerName === selection
    );

    if (poiData) {
      selectionData = {
        ...poiData,
        pane_type: 'poi',
        links: {
          website: poiData.websiteLink || '',
          x: poiData.twitterLink || '',
          farcaster: poiData.farcasterLink || '',
        },
      };
    } else if (supporterData) {
      selectionData = {
        ...supporterData,
        pane_type: 'poi',
        links: {
          website: supporterData.websiteLink || '',
          x: supporterData.twitterLink || '',
          farcaster: supporterData.farcasterLink || '',
        },
      };
    }

    // No POI or supporter match
    if (!poiData && !supporterData) {
      // Look at district match
      const districtData = Object.values(districtsData).find(
        (district: any) => district.layerName === selection
      );

      if (districtData) {
        selectionData = {
          ...districtData,
          pane_type: 'district',
        };
      }

      // No district match
      if (!districtData) {
        // Look at group match
        const groupData = Object.values(poiGroupsData).find(
          (group: any) => group.layerName === selection
        );

        if (groupData) {
          selectionData = {
            ...groupData,
            pane_type: 'group',
          };
        }
      }
    }

    if (!selectionData) {
      selectionData = {
        name: selection,
        layerName: selection,
        pane_type: 'fallback (no notion data)',
      };
    }

    const paneType = poiGroupsData[selectionData.groupId]?.name || 'District';

    console.log(selectionData, 'selectionData');

    switch (selectionData.pane_type) {
      case 'group':
      case 'district':
        // Get the district ID for the selected district
        const districtId = Object.entries(districtsData).find(
          ([id, district]) => district.layerName === selection
        )?.[0];

        // Filter supporters by district
        const districtSupporters = Object.values(supportersData).filter(
          (supporter) => supporter.districtId === districtId
        );

        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selectionData.layerName}
            displayName={selectionData.name}
            description={selectionData.description}
            subtitle={paneType}
            logo={selectionData.logo}
            backgroundColor={selectionData.backgroundColor}
            className="border-t border-[rgba(255,255,255,0.8)] shadow-[0_-2px_4px_0_rgba(54,54,76,0.10)]"
          >
            {districtSupporters.length > 0 && (
              <div className="bg-[rgba(255,255,255,0.4)] shadow-[0_2px_4px_0_rgba(54,54,76,0.10)] mt-4 max-h-[35vh] overflow-hidden">
                <div
                  className={cn(
                    'p-3 overflow-y-auto max-h-[35vh]',
                    districtSupporters.length > 8
                      ? 'pb-8 [mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]'
                      : 'pb-3'
                  )}
                >
                  <div className="text-base font-bold mb-3 text-[#353548]">
                    App Showcase
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {districtSupporters.map((supporter, index) => {
                      const content = (
                        <>
                          {supporter.logo ? (
                            <div className="shrink-0 w-[24px] h-[24px] border rounded-[1px] overflow-hidden flex items-center justify-center bg-white">
                              <img
                                src={supporter.logo}
                                alt={supporter.name}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          ) : (
                            <div className="shrink-0 w-[24px] h-[24px] border rounded-[1px] overflow-hidden flex items-center justify-center bg-white opacity-25">
                              <Image
                                src={Placeholder}
                                alt={supporter.name}
                                className="w-4 h-4 object-cover"
                                style={{ filter: 'brightness(0)' }}
                              />
                            </div>
                          )}
                          <p className="flex-1 text-sm leading-none text-[#353548] font-normal">
                            {supporter.name}
                          </p>
                        </>
                      );

                      return (
                        <div
                          className="flex gap-2 items-center py-0.5 w-full"
                          key={index}
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Pane>
        );

      case 'poi':
        // Get district name if supporter has a district
        const supporterDistrict = selectionData.districtId
          ? districtsData[selectionData.districtId]
          : null;

        // Check if this POI is a stage and get its color
        const isStage =
          selectionData.groupId === '14' ||
          [
            'amphitheater',
            'nogal-hall',
            'ceibo-hall',
            'bootcamp',
            'open-air-cinema',
            'music-stage_2',
          ].includes(selectionData.layerName);
        const stageColor = isStage
          ? getStageColor(selectionData.locationId, selectionData.layerName)
          : null;

        // Check if this POI should have a teal box icon
        const tealBoxIcon =
          !isStage && !selectionData.logo
            ? getTealBoxIcon(selectionData.groupId, selectionData.layerName)
            : null;

        let subtitle = selectionData.districtId ? 'District' : paneType;

        if (selectionData.layerName === 'ethluminal-gallery')
          subtitle = 'Activation';

        let linkText;

        if (selectionData.groupId === '9') linkText = 'Book Meeting Room';
        if (selectionData.groupId === '4') linkText = 'Book Corner';

        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selectionData.layerName}
            displayName={selectionData.name}
            description={selectionData.description}
            subtitle={subtitle}
            links={selectionData.links}
            logo={selectionData.logo}
            districtBadge={supporterDistrict?.name}
            districtData={supporterDistrict}
            backgroundColor={supporterDistrict?.backgroundColor}
            className="border-t border-[rgba(255,255,255,0.8)] shadow-[0_-2px_4px_0_rgba(54,54,76,0.10)]"
            stageColor={stageColor}
            isStage={isStage}
            linkText={linkText}
            tealBoxIcon={tealBoxIcon}
          />

        );

      default:
        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selectionData.layerName}
            displayName={selectionData.name}
            description={selectionData.description}
            subtitle={selectionData.paneType}
            links={selectionData.links}
            logo={selectionData.logo}
          >
            {/* <div>{selection}</div> */}
          </Pane>
        );
    }
  }, [selection, paneOpen, setSelection]);

  return ActivePane;
};

export default MapPane;
