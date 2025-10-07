import React, { useState } from "react";
import filterCss from "./filter.module.scss";
import cn from "classnames";
import { Checkbox } from "lib/components/ui/checkbox";
import { Badge } from "lib/components/ui/badge";
import { Switch } from "lib/components/ui/switch";
import { X, Search, ChevronDown } from "lucide-react";

export const useFilters = (
  events: any[],
  showCommunityByDefault: boolean,
  favorites?: string[] | null
) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const keysToFilterOn = ["eventType", "difficulty", "categories"];
  const filterableValues = {} as { [key: string]: Set<string> };

  const defaultFilter = {
    categories: [],
    difficulty: [],
    eventType: [],
    name: "",
    community: showCommunityByDefault,
    favorites: false,
  };

  console.log(events, "events");

  const [filter, setFilterState] = useState<any>(defaultFilter);

  // Compute if any filter is active (differs from default)
  const filterActive =
    // filter.name !== defaultFilter.name ||
    filter.categories.length !== defaultFilter.categories.length ||
    filter.difficulty.length !== defaultFilter.difficulty.length ||
    filter.eventType.length !== defaultFilter.eventType.length ||
    filter.name !== defaultFilter.name ||
    filter.favorites !== defaultFilter.favorites;

  // Function to handle filter updates with toggle behavior for arrays
  const setFilter = (filterKey: string, nextValue: any) => {
    setFilterState((prevFilter: any) => {
      const currentValue = prevFilter[filterKey];

      // Handle array-based filters (multi-choice with toggle)
      if (Array.isArray(currentValue)) {
        const isSelected = currentValue.includes(nextValue);
        return {
          ...prevFilter,
          [filterKey]: isSelected
            ? currentValue.filter((item: any) => item !== nextValue)
            : [...currentValue, nextValue],
        };
      }

      // Handle string-based filters (single choice with toggle)
      return {
        ...prevFilter,
        [filterKey]: currentValue === nextValue ? "" : nextValue,
      };
    });
  };

  // Function to reset all filters
  const resetFilter = () => {
    setFilterState(defaultFilter);
  };

  // Run through events collecting all the possible values to filter on for the specified keys above - looks a bit messy but w/e
  // Could hardcode the filter values too but this is future proof if someone changes the range of possible values for any of the above fields
  events.forEach((event: any) => {
    keysToFilterOn.forEach((key: any) => {
      const value = event[key];
      if (value !== undefined && value !== null) {
        if (!filterableValues[key]) filterableValues[key] = new Set();

        if (Array.isArray(value)) {
          value.forEach((val: any) => {
            if (!filterableValues[key].has(val)) filterableValues[key].add(val);
          });
        } else {
          if (!filterableValues[key].has(value))
            filterableValues[key].add(event[key]);
        }
      }
    });
  });

  const filteredEvents = events.filter((event: any) => {
    // Community filter
    if (!filter.community && !event.isCoreEvent) return false;

    if (favorites && filter.favorites) {
      const eventIsFavorited = favorites.some(
        (favoritedEvent: any) =>
          event.id.toString() === favoritedEvent.toString()
      );
      if (!eventIsFavorited) return false;
    }

    // Text search filter
    if (
      filter.name.length > 0 &&
      !(event.name?.toLowerCase() || "").includes(filter.name.toLowerCase()) &&
      !(event.organizer?.toLowerCase() || "").includes(
        filter.name.toLowerCase()
      )
    )
      return false;

    // Difficulty filter
    if (filter.difficulty.length > 0) {
      const difficultyMatch = filter.difficulty.includes(
        event["difficulty"] || ""
      );
      if (!difficultyMatch) return false;
    }

    // Event type filter
    if (filter.eventType.length > 0) {
      const typeMatch = filter.eventType.includes(event["eventType"] || "");
      if (!typeMatch) return false;
    }

    // Categories filter
    if (filter.categories.length > 0) {
      const categoryMatch = filter.categories.some((category: any) =>
        (event["categories"] || []).includes(category)
      );
      if (!categoryMatch) return false;
    }

    return true;
  });

  return {
    filterOpen,
    setFilterOpen,
    filteredEvents,
    filterableValues,
    keysToFilterOn,
    filter,
    setFilter,
    resetFilter,
    filterActive,
  };
};

export const FilterSummary = ({ filter }: { filter: any }) => {
  const computeFilterShorthand = (key: string, filters: string[]) => {
    if (filters.length === 0) return null;
    if (filters.length === 1) return filters[0];
    return `${key} (${filters.length})`;
  };

  const filterSummary =
    [
      computeFilterShorthand("Categories", filter.categories),
      computeFilterShorthand("Difficulty", filter.difficulty),
      computeFilterShorthand("Event Type", filter.eventType),
      filter.name ? `"${filter.name}"` : null,
      filter.favorites ? "Favorites" : null,
    ]
      .filter((val) => !!val)
      .map((val) => uppercaseFirstLetter(val as string))
      .join(", ") || "None";

  return (
    <div
      className={cn(
        filterCss["active-filters"],
        "max-w-[200px] truncate text-ellipsis hidden sm:!flex"
      )}
    >
      {/* <p className="small-text">Active filter:</p> */}
      <p className="text-xs line-clamp-2 leading-tight">
        <span className="font-medium">Active filter:</span> <br />
        <span className="text-ellipsis line-clamp-2">{filterSummary}</span>
      </p>
    </div>
  );
};

const filterKeyToLabel = (key: string) => {
  if (key === "eventType") return "Event Type";
  if (key === "difficulty") return "Difficulty";
  if (key === "category") return "Category";
  if (key === "name") return "Search";
  return key;
};

const uppercaseFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const Filter = ({
  filterOpen,
  setFilterOpen,
  events,
  filterableValues,
  keysToFilterOn,
  filter,
  setFilter,
  resetFilter,
  filterActive,
  showFavorites,
}: {
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  events: any[];
  filterableValues: any;
  keysToFilterOn: string[];
  filter: any;
  setFilter: (filterKey: string, nextValue: any) => void;
  resetFilter: () => void;
  filterActive: boolean;
  showFavorites?: boolean;
}) => {
  const filterableValuesKeys = Array.from(Object.keys(filterableValues));

  // Initialize accordions - open only if the filter group has active selections
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>();
    filterableValuesKeys.forEach((key) => {
      const activeFilters = filter[key] || [];
      const hasActiveFilters = Array.isArray(activeFilters)
        ? activeFilters.length > 0
        : activeFilters !== "";
      if (hasActiveFilters) {
        initialOpen.add(key);
      }
    });
    return initialOpen;
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <div className={cn(filterCss["filter-foldout"])}>
      <div className="flex flex-col gap-4 w-full shrink-0">
        <div className="flex justify-between items-center w-full shrink-0">
          <div className="text-sm font-medium underline">
            Refine your search
          </div>
          <div className="flex items-center gap-2">
            {filterActive && (
              <Badge
                className="text-sm font-normal cursor-pointer select-none h-6 flex items-center justify-center"
                onClick={resetFilter}
              >
                Reset
              </Badge>
            )}
            <Badge
              className="text-sm font-medium cursor-pointer h-6 w-6 p-0 flex items-center justify-center"
              onClick={() => setFilterOpen(false)}
            >
              <X size={16} />
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-end grow gap-2 shrink-0">
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

        {showFavorites && (
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={filter.favorites}
              onCheckedChange={(checked) => setFilter("favorites", checked)}
            />
            <p className="text-sm font-medium">Favorites</p>
          </div>
        )}

        {filterableValuesKeys.map((key) => {
          const valuesForFilter = Array.from(filterableValues[key]);
          const filterStateKey = key;
          const activeFilters = filter[filterStateKey] || [];
          const isOpen = openAccordions.has(key);

          if (valuesForFilter.length === 0) return null;

          return (
            <div key={key} className="flex flex-col gap-2 shrink-0">
              <div
                className="text-sm font-medium capitalize cursor-pointer flex items-center justify-between"
                onClick={() => toggleAccordion(key)}
              >
                <span>{filterKeyToLabel(key)}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform",
                    isOpen ? "rotate-180" : ""
                  )}
                />
              </div>
              {isOpen && (
                <div className="flex flex-col gap-0.5">
                  {Array.from(valuesForFilter).map((value: any) => {
                    const isSelected = Array.isArray(activeFilters)
                      ? activeFilters.includes(value)
                      : activeFilters === value;

                    return (
                      <div
                        key={value}
                        className={cn(
                          "text-sm cursor-pointer py-0.5 rounded transition-colors select-none flex items-center gap-2",
                          isSelected
                            ? "bg-blue-100 text-blue-800 font-medium"
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => setFilter(filterStateKey, value)}
                      >
                        <Checkbox checked={isSelected} className="mb-0.5" />
                        {uppercaseFirstLetter(value)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
