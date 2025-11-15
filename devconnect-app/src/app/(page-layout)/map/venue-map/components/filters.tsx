import { useState, useEffect, useRef } from 'react';
import FlexibleDrawer from 'lib/components/flexible-drawer';
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll-native';
import { ChevronDownIcon, TextSearch, XIcon } from 'lucide-react';
import Icon from '@mdi/react';
import {
  mdiCoffeeOutline,
  mdiHubOutline,
  mdiBriefcaseOutline,
  mdiDomain,
  mdiSoccer,
  mdiFoodOutline,
  mdiHandshakeOutline,
  mdiInformationOutline,
  mdiCashPlus,
  mdiHumanMaleFemale,
  mdiMicrophoneVariant,
} from '@mdi/js';
import { poisData } from '@/data/pois';
import { districtsData } from '@/data/districts';
import cn from 'classnames';

const filters = [
  {
    icon: mdiHubOutline,
    key: 'community-hubs',
    label: 'Community Hubs',
    pois: poisData.filter((poi) => poi.groupId === '3'), // Fixed: Community Hubs is groupId 3
    size: 0.5,
  },
  {
    icon: mdiMicrophoneVariant,
    key: 'stages',
    label: 'Stages',
    pois: poisData.filter((poi) => poi.groupId === '15'), // Correct: Stages is groupId 15
  },
  {
    icon: mdiBriefcaseOutline,
    key: 'coworking',
    label: 'Coworking',
    pois: poisData.filter((poi) => poi.groupId === '2'), // Fixed: Co-work is groupId 2
  },
  {
    icon: mdiDomain,
    key: 'districts',
    label: 'Districts',
    pois: poisData.filter((poi) => poi.districtId !== null), // Correct: filtering by districtId
  },
  {
    icon: mdiSoccer,
    key: 'entertainment',
    label: 'Entertainment',
    pois: poisData.filter((poi) => poi.groupId === '5'), // Fixed: Entertainment is groupId 5
  },
  {
    icon: mdiFoodOutline,
    key: 'food-beverage',
    label: 'Food & Beverage',
    pois: poisData.filter((poi) => poi.groupId === '6'), // Fixed: Food & Beverage is groupId 6
  },
  {
    icon: mdiHandshakeOutline,
    key: 'meeting-rooms',
    label: 'Meeting Rooms',
    pois: poisData.filter((poi) => poi.groupId === '8'), // Fixed: Meeting Rooms is groupId 8
  },
  {
    icon: mdiInformationOutline,
    key: 'onboarding',
    label: 'Onboarding',
    pois: poisData.filter((poi) => poi.groupId === '10' || poi.groupId === '11'), // Fixed: Onboarding Area (10) and Onboarding desk (11)
  },
  {
    icon: mdiCashPlus,
    key: 'onramps',
    label: 'Onramps',
    pois: poisData.filter((poi) => poi.groupId === '12'), // Correct: Onramp is groupId 12
  },
  // Additional categories available in the data:
  // - Activation (groupId: 1)
  // - Discussion corner (groupId: 4)
  // - Interview rooms (groupId: 7)
  // - Music Stage (groupId: 9)
  // - QR-code (groupId: 13)
  // - SWAG station (groupId: 14)
];

export const SurfaceFilters = ({
  selection,
  setSelection,
}: {
  selection: string | null;
  setSelection: (selection: string | null) => void;
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const toggleDropdown = (key: string, hasGroup: boolean) => {
    if (!hasGroup) return;
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handlePoiClick = (layerName: string) => {
    setSelection(layerName);
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'flex items-center absolute top-0 left-0 px-2 pr-4 right-0 z-[1000000000] touch-only:!px-0',
        openDropdown ? 'pointer-events-none' : ''
      )}
      style={{
        maskImage:
          'linear-gradient(to right, transparent 0%, white 8px, white calc(100% - 24px), transparent 100%)',
        touchAction: 'pan-x',
      }}
      data-prevent-interaction-element="true"
      onTouchStartCapture={handleTouchStart}
      onPointerDownCapture={handlePointerDown}
    >
      <SwipeToScroll>
        <div
          className={cn(
            'flex items-center py-2 pl-2 relative',
            openDropdown ? '!pb-[80vh]' : ''
          )}
        >
          {filters.map((filter, index) => {
            const hasGroup = filter.pois && filter.pois.length > 0;
            const isOpen = openDropdown === filter.key;

            return (
              <div
                key={filter.key}
                className={cn(
                  'relative shrink-0',
                  openDropdown ? 'pointer-events-auto' : ''
                )}
              >
                <button
                  className={`text-sm shrink-0 basic-button white-button !px-2 small-button flex items-center !gap-[6px] shadow-xs ${
                    index === filters.length - 1 ? 'mr-8' : 'mr-0'
                  } ${index === 0 ? '!ml-0' : 'ml-2'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown(filter.key, hasGroup ?? false);
                  }}
                >
                  <Icon
                    path={filter.icon}
                    size={filter.size || 0.6}
                    className="shrink-0"
                  />
                  {filter.label}
                  {hasGroup && (
                    <ChevronDownIcon
                      className={`w-[14px] text-[#0073de] h-[14px] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {hasGroup && isOpen && (
                  <div
                    className={cn(
                      'absolute top-full mt-1 bg-white rounded shadow-lg border border-gray-200 py-1 w-[fit-content] max-h-[300px] overflow-y-auto z-[1000000001]',
                      index === 0 ? 'left-0' : 'left-2'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {filter.pois?.map((poi) => (
                      <button
                        key={poi.name}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors duration-150 text-[#0073de] font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePoiClick(poi.layerName);
                        }}
                      >
                        {poi.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="w-4 h-[1px] shrink-0"></div>
        </div>
      </SwipeToScroll>
    </div>
  );
};

export const ListFilters = ({
  open,
  setOpen,
  selection,
  setSelection,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  selection: string | null;
  setSelection: (selection: string | null) => void;
}) => {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  const toggleFilter = (key: string) => {
    setExpandedFilter((prev) => (prev === key ? null : key));
  };

  const handlePoiClick = (layerName: string) => {
    setSelection(layerName);
    setOpen(false);
  };

  return (
    <>
      <button
        className="absolute bottom-3 left-3 flex shadow-xs items-center !text-[rgba(0,115,222,1)] !gap-1.5 !px-2.5 !h-[auto] py-1 cursor-pointer z-10 basic-button white-button small-button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onTouchStartCapture={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        data-prevent-interaction-element={true}
      >
        <TextSearch className="w-4 h-4" />
        <div className="text-sm font-medium">Find</div>
      </button>
      <FlexibleDrawer
        open={open}
        onOpenChange={setOpen}
        hideHandle={true}
        className=""
      >
        <div
          className="flex flex-col"
          style={{
            paddingBottom: 'calc(4px + max(0px, env(safe-area-inset-bottom)))',
          }}
        >
          <div className="flex items-center justify-center border-b border-gray-100 px-4 pb-2.5 pt-3">
            <h2 className="text-sm font-semibold text-[rgba(53,53,72,1)]">
              Find Location
            </h2>
            {/* <button
              className="basic-button white-button small-button square-button"
              onClick={() => setOpen(false)}
            > */}
            <XIcon
              className="w-3.5 h-3.5 text-gray-500 absolute right-4"
              onClick={() => setOpen(false)}
            />
            {/* </button> */}
          </div>
          <div className="flex flex-col bg-white mb-2 max-h-[50vh] overflow-y-auto">
            {filters.map((filter, index) => {
              const hasGroup = filter.pois && filter.pois.length > 0;
              const isExpanded = expandedFilter === filter.key;

              return (
                <div key={filter.key}>
                  <button
                    className={`
                      flex items-center justify-between py-1.5 text-left px-4 pr-4 w-full
                      hover:bg-gray-50 transition-colors duration-150
                      ${!isExpanded ? 'border-b border-gray-100' : ''} font-medium
                      text-sm
                    `}
                    onClick={() => hasGroup && toggleFilter(filter.key)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon path={filter.icon} size={0.6} />
                      {filter.label}
                    </span>
                    {hasGroup && (
                      <ChevronDownIcon
                        className={`w-[14px] h-[14px] text-[rgba(0,115,222,1)] transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {hasGroup && isExpanded && (
                    <div className="bg-[#EAF4FB] border-b border-gray-100 max-h-[240px] overflow-y-auto py-1">
                      {filter.pois?.map((poi) => (
                        <button
                          key={poi.name}
                          className="w-full text-left px-4 pl-6 py-1.5 font-medium text-sm hover:bg-gray-100 transition-colors duration-150"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePoiClick(poi.layerName);
                          }}
                        >
                          {poi.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </FlexibleDrawer>
    </>
  );
};
