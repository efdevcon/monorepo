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
import { questsData } from '@/data/quests';
import { questGroupsData } from '@/data/questGroups';
import { locationsData } from '@/data/locations';
import { District } from '@/types/api-data';
import { Quest } from '@/types/quest';
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
    '14': mdiCoffeeOutline, // Power-up Station (Coffee)
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
  questAvailable,
  backgroundColor,
  showAsModal = false,
  supporterQuest,
  stageColor,
  isStage = false,
  tealBoxIcon,
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
  questAvailable?: boolean;
  backgroundColor?: string;
  showAsModal?: boolean;
  supporterQuest?: Quest | null;
  stageColor?: string | null;
  isStage?: boolean;
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
              href={links.website}
              {...(links.website.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center gap-2 h-[40px] px-4 py-2 cursor-pointer">
                <span className="font-bold text-sm text-[#0073DE]">
                  {isStage ? 'View Programming' : 'Visit Website'}
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
      className="p-4"
      style={{
        ...backgroundStyle,
        // maxHeight: '66.67vh',
        paddingBottom: showAsModal
          ? '16px'
          : 'calc(16px + max(0px, env(safe-area-inset-bottom)))',
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
                districtBadge ? 'border-2 border-[#74ACDF] rounded-[4px]' : ''
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
            {questAvailable ? (
              <div className="flex gap-1 items-center">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 1L10.163 5.382L15 6.135L11.5 9.545L12.326 14.365L8 12.082L3.674 14.365L4.5 9.545L1 6.135L5.837 5.382L8 1Z"
                    stroke="#353548"
                    strokeWidth="1"
                    fill="none"
                  />
                </svg>
                <p className="text-xs font-medium text-[#353548] font-mono">
                  Quest available
                </p>
              </div>
            ) : subtitle === 'TBD' || !subtitle ? null : (
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
      {supporterQuest?.instructions && (
        <div className="flex flex-col gap-1 leading-[1.5] mt-4">
          <p className="font-bold text-base text-[#20202B] tracking-[-0.1px]">
            Quest
          </p>
          <p className="text-sm text-[#353548] font-normal">
            {supporterQuest.instructions}
          </p>
        </div>
      )}
      {LinkItems}
    </div>
  );

  if (showAsModal) {
    return paneOpen ? (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setSelection(null)}
        />

        {/* Modal Content */}
        <div
          className={cn(
            'relative w-full max-w-md rounded-lg shadow-lg overflow-hidden',
            className
          )}
        >
          {paneContent}
        </div>
      </div>
    ) : null;
  }

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
  fromQuests?: boolean;
}) => {
  const { selection, setSelection, fromQuests = false } = props;

  // Hooks must be called before any conditional returns
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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

  //   const handleClose = () => {
  //     setCurrentFilters(initialFilters);
  //     window.location.href = '/map';
  //   };

  //   const handleBack = () => {
  //     window.location.href = '/quests#14';
  //   };

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
            showAsModal={isDesktop && fromQuests}
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
                      // Find quest for this supporter
                      const supporterQuest = questsData.find(
                        (quest) =>
                          quest.supporterId ===
                          Object.keys(supportersData).find(
                            (key) => supportersData[key] === supporter
                          )
                      );

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

                      return supporterQuest ? (
                        <Link
                          href={`/quests#${supporterQuest.id}`}
                          key={index}
                          className="flex gap-2 items-center py-0.5 w-full cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {content}
                        </Link>
                      ) : (
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

        // Find the quest for this supporter
        const supporterId = Object.keys(supportersData).find(
          (key) => supportersData[key].layerName === selection
        );
        const supporterQuest = supporterId
          ? questsData.find((quest) => quest.supporterId === supporterId)
          : null;

        // Check if this POI is a stage and get its color
        const isStage =
          selectionData.groupId === '15' ||
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

        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selectionData.layerName}
            displayName={selectionData.name}
            description={selectionData.description}
            subtitle={selectionData.districtId ? 'District' : paneType}
            links={selectionData.links}
            logo={selectionData.logo}
            districtBadge={supporterDistrict?.name}
            districtData={supporterDistrict}
            questAvailable={!!supporterQuest}
            backgroundColor={supporterDistrict?.backgroundColor}
            className="border-t border-[rgba(255,255,255,0.8)] shadow-[0_-2px_4px_0_rgba(54,54,76,0.10)]"
            showAsModal={isDesktop && fromQuests}
            supporterQuest={supporterQuest}
            stageColor={stageColor}
            isStage={isStage}
            tealBoxIcon={tealBoxIcon}
          >
            {/* View Quest/Map Button for supporters with quests */}
            {supporterQuest && (
              <Link
                href={
                  fromQuests
                    ? `/map?filter=${selection}`
                    : `/quests#${supporterQuest.id}`
                }
              >
                <button
                  className="w-full bg-[#0073DE] text-white font-bold text-base py-3 px-6 rounded-[1px] mt-4 cursor-pointer"
                  style={{
                    boxShadow: '0px 4px 0px 0px #005493',
                  }}
                >
                  {fromQuests
                    ? `View ${supporterDistrict?.name} District`
                    : 'View Quest'}
                </button>
              </Link>
            )}
          </Pane>
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
            showAsModal={isDesktop && fromQuests}
          >
            {/* <div>{selection}</div> */}
          </Pane>
        );
    }
  }, [selection, paneOpen, setSelection, isDesktop, fromQuests]);

  return ActivePane;
};

export default MapPane;
