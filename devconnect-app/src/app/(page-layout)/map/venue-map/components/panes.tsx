import FlexibleDrawer from 'lib/components/flexible-drawer';
import { Dispatch, SetStateAction } from 'react';
import cn from 'classnames';
import { MapPin, GlobeIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import X from './icons/x.svg';
import FarcasterIcon from './icons/farcaster.svg';
// import GlobeIcon from './icons/globe.svg';
import Link from 'next/link';
import Image from 'next/image';
import Placeholder from './images/placeholder.png';
import { poisData } from '@/data/pois';
import { districtsData } from '@/data/districts';
import { poiGroupsData } from '@/data/poiGroups';
import { supportersData } from '@/data/supporters';
import { questsData } from '@/data/quests';
import { questGroupsData } from '@/data/questGroups';

const Pane = ({
  children,
  className,
  paneOpen,
  selection,
  setSelection,
  description,
  subtitle,
  links,
  logo,
  districtBadge,
  questAvailable,
  backgroundColor,
}: {
  children?: React.ReactNode;
  className?: string;
  paneOpen: boolean;
  links?: Record<'website' | 'x' | 'farcaster', string>;
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
  description?: string;
  subtitle?: string;
  logo?: string;
  districtBadge?: string;
  questAvailable?: boolean;
  backgroundColor?: string;
}) => {
  const imageSrc = logo || '';

  // Combine white overlay with district gradient
  const backgroundStyle = backgroundColor
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), ${backgroundColor}`,
      }
    : undefined;

  const LinkItems = (() => {
    if (!links || Object.keys(links).length === 0) return null;

    return (
      <div className="flex flex-col gap-1 mt-4">
        <p className="font-bold text-base text-[#20202B] leading-[1.5] tracking-[-0.1px]">
          Links
        </p>
        <div className="flex items-start gap-2">
          {links && links.website && (
            <Link
              href={links.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center gap-2 h-[40px] px-4 py-2">
                <span className="font-bold text-sm text-[#0073DE]">
                  Visit Website
                </span>
                <GlobeIcon className="w-4 h-4 shrink-0 text-[#0073DE]" />
              </button>
            </Link>
          )}
          {links && links.x && (
            <Link href={links.x} target="_blank" rel="noopener noreferrer">
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center p-2 size-[40px]">
                <X className="!h-4 !w-auto shrink-0 icon" />
              </button>
            </Link>
          )}
          {links && links.farcaster && (
            <Link
              href={links.farcaster}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="bg-white border border-[#EDEDF0] flex items-center justify-center p-2 size-[40px]">
                <FarcasterIcon className="!h-4 !w-auto shrink-0 icon" />
              </button>
            </Link>
          )}
        </div>
      </div>
    );
  })();

  return (
    <FlexibleDrawer
      open={paneOpen}
      onOpenChange={() => setSelection(null)}
      className={cn('p-0', className)}
      hideHandle={true}
    >
      <div
        className="p-4 overflow-y-auto"
        style={{
          ...backgroundStyle,
          maxHeight: '66.67vh',
          paddingBottom: 'calc(16px + max(0px, env(safe-area-inset-bottom)))',
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
                  alt={selection || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Image
                src={Placeholder}
                alt={selection || ''}
                className="w-8 h-8 object-cover shrink-0"
                style={{ filter: 'brightness(0)' }}
              />
            )}

            <div className="flex flex-col gap-1.5 pr-2 justify-center">
              <div className="flex gap-1.5 items-center">
                <p className="font-bold text-[18px] leading-none text-[#20202B]">
                  {selection}
                </p>
                {districtBadge && (
                  <div className="border border-[#353548] px-1 py-0.5">
                    <p className="text-[10px] font-semibold text-[#353548] leading-[1.3] tracking-[0.2px]">
                      {districtBadge}
                    </p>
                  </div>
                )}
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
              ) : (
                subtitle && (
                  <div className="text-xs leading-tight">{subtitle}</div>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="flex items-center gap-1 cursor-pointer basic-button white-button small-button square-button"
              onClick={() => {
                navigator.clipboard.writeText(
                  window.location.origin +
                    '/map?filter=' +
                    encodeURIComponent(selection || '')
                );

                toast.success('Location link copied to clipboard', {
                  duration: 1000,
                });
              }}
            >
              {/* Copy Location */}
              <MapPin className="w-4 h-4 cursor-pointer" />
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
            <p className="text-sm text-[#353548] font-normal">{description}</p>
          </div>
        )}
        {LinkItems}
      </div>
    </FlexibleDrawer>
  );
};

const MapPane = (props: {
  selection: string | null;
  setSelection: Dispatch<SetStateAction<string | null>>;
}) => {
  const { selection, setSelection } = props;

  //   const handleClose = () => {
  //     setCurrentFilters(initialFilters);
  //     window.location.href = '/map';
  //   };

  //   const handleBack = () => {
  //     window.location.href = '/quests#14';
  //   };

  console.log('poisData', poisData);
  console.log('districtsData', districtsData);
  console.log('poiGroupsData', poiGroupsData);
  console.log('supportersData', supportersData);
  console.log('questsData', questsData);
  console.log('questGroupsData', questGroupsData);

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

  if (!selection) {
    return null;
  }

  const ActivePane = (() => {
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
        pane_type: 'fallback (no notion data)',
      };
    }

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
            selection={selection}
            description={selectionData.description}
            subtitle={selectionData.pane_type}
            logo={selectionData.logo}
            backgroundColor={selectionData.backgroundColor}
            className="border-t border-[rgba(255,255,255,0.8)] shadow-[0_-2px_4px_0_rgba(54,54,76,0.10)]"
          >
            {districtSupporters.length > 0 && (
              <div className="bg-[rgba(255,255,255,0.4)] p-3 shadow-[0_2px_4px_0_rgba(54,54,76,0.10)] mt-4">
                <div className="text-base font-bold mb-3 text-[#353548]">
                  App Showcase
                </div>
                <div className="flex gap-4 items-start w-full">
                  {/* Split supporters into two columns */}
                  <div className="flex-1 flex flex-col gap-2">
                    {districtSupporters
                      .slice(0, Math.ceil(districtSupporters.length / 2))
                      .map((supporter, index) => {
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
                              <div className="shrink-0 w-[24px] h-[24px] border border-[#74ACDF] rounded-[1px] overflow-hidden flex items-center justify-center bg-white">
                                <img
                                  src={supporter.logo}
                                  alt={supporter.name}
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="shrink-0 w-[24px] h-[24px] border border-[#74ACDF] rounded-[1px] overflow-hidden flex items-center justify-center bg-white opacity-25">
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
                  <div className="flex-1 flex flex-col gap-2">
                    {districtSupporters
                      .slice(Math.ceil(districtSupporters.length / 2))
                      .map((supporter, index) => {
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
                              <div className="shrink-0 w-[24px] h-[24px] border border-[#74ACDF] rounded-[1px] overflow-hidden flex items-center justify-center bg-white">
                                <img
                                  src={supporter.logo}
                                  alt={supporter.name}
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="shrink-0 w-[24px] h-[24px] border border-[#74ACDF] rounded-[1px] overflow-hidden flex items-center justify-center bg-white opacity-25">
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

        return (
          <Pane
            paneOpen={paneOpen}
            setSelection={setSelection}
            selection={selectionData.name}
            description={selectionData.description}
            subtitle={
              !selectionData.districtId ? selectionData.pane_type : undefined
            }
            links={selectionData.links}
            logo={selectionData.logo}
            districtBadge={supporterDistrict?.name}
            questAvailable={!!supporterQuest}
            backgroundColor={supporterDistrict?.backgroundColor}
            className="border-t border-[rgba(255,255,255,0.8)] shadow-[0_-2px_4px_0_rgba(54,54,76,0.10)]"
          >
            {/* View Quest Button for supporters with quests */}
            {supporterQuest && (
              <Link href={`/quests#${supporterQuest.id}`}>
                <button
                  className="w-full bg-[#0073DE] text-white font-bold text-base py-3 px-6 rounded-[1px] mt-4"
                  style={{
                    boxShadow: '0px 4px 0px 0px #005493',
                  }}
                >
                  View Quest
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
            selection={selectionData.name}
            description={selectionData.description}
            subtitle={selectionData.pane_type}
            links={selectionData.links}
            logo={selectionData.logo}
          >
            {/* <div>{selection}</div> */}
          </Pane>
        );
    }
  })();

  return ActivePane;
};

export default MapPane;
