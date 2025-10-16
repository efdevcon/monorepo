import { useState } from 'react';
import FlexibleDrawer from 'lib/components/flexible-drawer';
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll';
import { FilterIcon } from 'lucide-react';

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
  return (
    <div
      className="flex items-center gap-1 absolute top-0 left-0 px-2 pr-4 right-0 z-10 touch-only:!px-0"
      style={{
        maskImage:
          'linear-gradient(to right, transparent 0%, white 8px, white calc(100% - 24px), transparent 100%)',
      }}
      data-prevent-interaction-element={true}
    >
      <SwipeToScroll>
        <div
          className="flex items-center py-2"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {filters.map((filter, index) => (
            <button
              key={filter.key}
              className={`text-xs shrink-0 basic-button white-button small-button ml-2 ${
                index === filters.length - 1 ? 'mr-8' : 'mr-0'
              }`}
            >
              {filter.label}
            </button>
          ))}
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
        className="absolute bottom-2 left-2 flex items-center gap-1 cursor-pointer z-10 basic-button white-button small-button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        data-prevent-interaction-element={true}
      >
        List
        <FilterIcon className="w-4 h-4" />
      </button>
      <FlexibleDrawer
        open={open}
        onOpenChange={setOpen}
        hideHandle={true}
        className="p-4"
      >
        hello?
      </FlexibleDrawer>
    </>
  );
};
