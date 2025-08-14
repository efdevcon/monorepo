import React from "react";
import cn from "classnames";
import { ListFilter, Search } from "lucide-react";
import { FilterSummary } from "./filter";

const venueEvents = [
  { color: "bg-[rgba(255,133,166,1)]", label: "Cowork" },
  { color: "bg-[rgba(116,172,223,1)]", label: "Core" },
  { color: "bg-[rgba(246,180,14,1)]", label: "Partner" },
];

const communityEvents = [
  { color: "bg-[rgba(136,85,204,1)]", label: "Community" },
];

const ActionBar = ({
  isCommunityCalendar,
  filterOpen,
  setFilterOpen,
  filterableValues,
  setFilter,
  resetFilter,
  filter,
}: {
  isCommunityCalendar: boolean;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  filterableValues: any;
  setFilter: (filterKey: string, nextValue: any) => void;
  filter: any;
  resetFilter: () => void;
}) => {
  const categories = isCommunityCalendar ? communityEvents : venueEvents;
  const hasLoggedInUser = true;

  return (
    <div className="flex justify-between items-center w-full gap-4">
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 text-sm font-medium border border-[rgba(224,224,235,1)] border-solid p-4 py-2"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <ListFilter size={13} className={filterOpen ? "rotate-90" : ""} />
          Filter
        </button>
        <FilterSummary />
      </div>

      <div className="flex items-center gap-4">
        {categories.map((category) => (
          <div
            key={category.label}
            className={cn("text-sm font-medium flex items-center gap-1.5")}
          >
            <div className={cn("w-[14px] h-[14px]", category.color)} />
            {category.label}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end grow gap-2">
        <div className="flex items-center gap-2 border border-[rgba(224,224,235,1)] border-solid p-3 py-2 max-w-[320px] grow">
          <Search size={15} color="rgba(124, 124, 153, 1)" />
          <input
            className="grow border-none outline-none bg-transparen ml-0.5"
            placeholder="Search events or organizers"
            type="text"
            value={filter.name}
            onChange={(e: any) => setFilter("name", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
