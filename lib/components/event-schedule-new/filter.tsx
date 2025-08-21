import { useState } from "react";
import filterCss from "./filter.module.scss";
import cn from "classnames";
import { Checkbox } from "lib/components/ui/checkbox";
import { Badge } from "lib/components/ui/badge";
import { X, Search } from "lucide-react";

export const useFilters = (events: any[]) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const keysToFilterOn = ["eventType", "difficulty", "categories"];
  const filterableValues = {} as { [key: string]: Set<string> };

  const defaultFilter = {
    category: [],
    difficulty: [],
    eventType: [],
    name: "",
  };

  const [filter, setFilterState] = useState<any>(defaultFilter);

  // Compute if any filter is active (differs from default)
  const filterActive =
    // filter.name !== defaultFilter.name ||
    filter.category.length !== defaultFilter.category.length ||
    filter.difficulty.length !== defaultFilter.difficulty.length ||
    filter.eventType.length !== defaultFilter.eventType.length;

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
    // Text search filter
    if (
      filter.name.length > 0 &&
      !(event.name?.toLowerCase() || '').includes(filter.name.toLowerCase())
    )
      return false;

    // Difficulty filter
    if (filter.difficulty.length > 0) {
      const difficultyMatch = filter.difficulty.includes(event["difficulty"] || '');
      if (!difficultyMatch) return false;
    }

    // Event type filter
    if (filter.eventType.length > 0) {
      const typeMatch = filter.eventType.includes(event["eventType"] || '');
      if (!typeMatch) return false;
    }

    // Categories filter
    if (filter.category.length > 0) {
      const categoryMatch = filter.category.some((category: any) =>
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
      computeFilterShorthand("Categories", filter.category),
      computeFilterShorthand("Difficulty", filter.difficulty),
      computeFilterShorthand("Event Type", filter.eventType),
      filter.name ? `Search: "${filter.name}"` : null,
    ]
      .filter((val) => !!val)
      .map((val) => uppercaseFirstLetter(val as string))
      .join(", ") || "None";

  return (
    <div className={filterCss["active-filters"]}>
      <p className="small-text">Active filter:</p>
      <p className="bold tiny-text">{filterSummary}</p>
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
}) => {
  const filterableValuesKeys = Array.from(Object.keys(filterableValues));

  return (
    <div className={cn(filterCss["filter-foldout"])}>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center w-full">
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

        {filterableValuesKeys.map((key) => {
          const valuesForFilter = Array.from(filterableValues[key]);
          const filterStateKey = key;
          const activeFilters = filter[filterStateKey] || [];

          if (valuesForFilter.length === 0) return null;

          return (
            <div key={key} className="flex flex-col gap-2">
              <div className="text-sm font-medium capitalize">
                {filterKeyToLabel(key)}
              </div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
