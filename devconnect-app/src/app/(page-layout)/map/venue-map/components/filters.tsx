import { useState } from 'react';
import FlexibleDrawer from 'lib/components/flexible-drawer';
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll-native';
import { ChevronDownIcon, TextSearch, XIcon } from 'lucide-react';

const filters = [
  { key: 'coffee', label: 'Coffee' },
  { key: 'community-hubs', label: 'Community Hubs' },
  { key: 'coworking', label: 'Coworking' },
  { key: 'districts', label: 'Districts' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'food-beverage', label: 'Food & Beverage' },
  { key: 'meeting-rooms', label: 'Meeting rooms' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'onramps', label: 'Onramps' },
  { key: 'toilets', label: 'Toilets' },
  { key: 'stages', label: 'Stages' },
];

export const SurfaceFilters = () => {
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="flex items-center absolute top-0 left-0 px-2 pr-4 right-0 z-[1000000000] touch-only:!px-0"
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
        <div className="flex items-center py-2 pl-2">
          {filters.map((filter, index) => (
            <button
              key={filter.key}
              className={`text-sm shrink-0 basic-button white-button small-button  ${
                index === filters.length - 1 ? 'mr-8' : 'mr-0'
              } ${index === 0 ? '!ml-0' : 'ml-1'}`}
            >
              {filter.label}
            </button>
          ))}
          <div className="w-4 h-[1px] shrink-0"></div>
        </div>
      </SwipeToScroll>
    </div>
  );
};

export const ListFilters = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  return (
    <>
      <button
        className="absolute bottom-2 left-2 flex items-center !text-[rgba(0,115,222,1)] !gap-1 !px-3s cursor-pointer z-10 basic-button white-button small-button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onTouchStartCapture={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        data-prevent-interaction-element={true}
      >
        <TextSearch className="w-4 h-4" />
        <div className="text-sm font-medium">List</div>
      </button>
      <FlexibleDrawer
        open={open}
        onOpenChange={setOpen}
        hideHandle={true}
        className=""
      >
        <div className="flex flex-col">
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
          <div className="flex flex-col overflow-hidden bg-white mb-2">
            {filters.map((filter, index) => (
              <button
                key={filter.key}
                className={`
                  flex items-center justify-between py-1.5 text-left px-4 pr-4
                  hover:bg-gray-50 transition-colors duration-150
                  border-b border-gray-100 last:border-b-0 font-medium
                  text-sm
                `}
              >
                <span>{filter.label}</span>
                <ChevronDownIcon className="w-[14px] h-[14px] text-[rgba(0,115,222,1)]" />
              </button>
            ))}
          </div>
        </div>
      </FlexibleDrawer>
    </>
  );
};
