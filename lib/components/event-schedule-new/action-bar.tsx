import React from "react";
import cn from "classnames";
import { Calendar, Grid, List, ListFilter, Search } from "lucide-react";
import { FilterSummary } from "./filter";
import { Switch } from "lib/components/ui/switch";
import { Separator } from "../ui/separator";
// import Export from "./export";

const venueEvents = [
  {
    colors: ["bg-[rgba(255,133,166,1)]", "bg-[rgba(116,172,223,1)]"],
    label: "World's Fair (La Rural)",
  },
  {
    colors: ["bg-[rgba(136,85,204,1)]"],
    label: "Community (Buenos Aires)",
  },
];

// const communityEvents = [
//   { color: "bg-[rgba(136,85,204,1)]", label: "Community" },
// ];

const ActionBar = ({
  isCommunityCalendar,
  filterOpen,
  setFilterOpen,
  filterableValues,
  setFilter,
  resetFilter,
  filter,
  filterActive,
  events,
  viewMode,
  setViewMode,
}: {
  isCommunityCalendar: boolean;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  filterableValues: any;
  setFilter: (filterKey: string, nextValue: any) => void;
  filter: any;
  resetFilter: () => void;
  filterActive: boolean;
  events: any[];
  viewMode: "list" | "grid";
  setViewMode: (viewMode: "list" | "grid") => void;
}) => {
  const categories = venueEvents; // isCommunityCalendar ? communityEvents : venueEvents;
  const hasLoggedInUser = true;

  return (
    <div
      data-type="action-bar"
      className={cn(
        "flex justify-between items-center min-w-full gap-3 md:gap-4 overflow-x-auto"
      )}
    >
      <div className="flex items-center gap-2 shrink-0">
        <button
          className={cn(
            "flex items-center gap-2 text-sm font-medium border border-[rgba(224,224,235,1)] border-solid p-4 py-2 transition-colors duration-300 shrink-0",
            (filterActive || filterOpen) && "bg-blue-50"
          )}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <ListFilter size={13} />
          Filter
        </button>
        {filterActive && <FilterSummary filter={filter} />}
      </div>

      <div className="flex items-center  mr-6 cursor-pointer select-none">
        <Switch
          id="airplane-mode"
          onCheckedChange={() => setFilter("community", !filter.community)}
          checked={filter.community}
        />
        <label
          htmlFor="airplane-mode"
          className="font-medium text-sm pl-2 cursor-pointer select-none"
        >
          Community
        </label>
      </div>

      <div className="flex items-center gap-4 shrink-0 grow lg:grow-0 hidden md:flex">
        {categories.map((category) => (
          <div
            key={category.label}
            className={cn("text-sm font-medium flex items-center gap-1.5")}
          >
            {category.colors?.map((color) => (
              <div className={cn("w-[14px] h-[14px]", color)} key={color} />
            ))}

            {category.label}
          </div>
        ))}
      </div>

      <div className="flex md:hidden items-center gap-2 shrink-0 grow justify-end">
        <div
          className={cn(
            "text-sm h-[40px] w-[40px] font-medium flex items-center border border-solid border-[rgba(224,224,235,1)] cursor-pointer gap-1.5 justify-center",
            viewMode === "list" && "bg-blue-50"
          )}
          onClick={() => setViewMode("list")}
        >
          <List size={17} className={viewMode === "list" ? "" : ""} />
          {/* List */}
        </div>
        <div
          className={cn(
            "text-sm h-[40px] w-[40px] font-medium flex items-center border border-solid border-[rgba(224,224,235,1)] cursor-pointer gap-1.5 justify-center",
            viewMode === "grid" && "bg-blue-50"
          )}
          onClick={() => setViewMode("grid")}
        >
          <Calendar size={17} className={viewMode === "grid" ? "" : ""} />
          {/* Calendar */}
        </div>
      </div>

      <div className="items-center justify-end gap-2 shrink-0 hidden grow lg:flex">
        {/* <Export events={events} /> */}
        <div className="flex items-center gap-2 border border-[rgba(224,224,235,1)] border-solid p-3 py-2 max-w-[320px] grow">
          <Search size={15} color="rgba(124, 124, 153, 1)" />
          <input
            className="grow border-none outline-none bg-transparen ml-0.5"
            placeholder="Search events"
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
