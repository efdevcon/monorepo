import { useState } from "react";
import filterCss from "./filter.module.scss";
import cn from "classnames";
import { X } from "lucide-react";

export const useFilters = (events: any[]) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const keysToFilterOn = ["event_type", "difficulty", "categories"];
  const filterableValues = {} as { [key: string]: Set<string> };

  const defaultFilter = {
    category: [],
    difficulty: [],
    event_type: [],
    name: "",
  };

  const [filter, setFilterState] = useState<any>(defaultFilter);

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
      if (value) {
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
      !event.name.toLowerCase().includes(filter.name.toLowerCase())
    )
      return false;

    // Difficulty filter
    if (filter.difficulty.length > 0) {
      const difficultyMatch = filter.difficulty.includes(event["difficulty"]);
      if (!difficultyMatch) return false;
    }

    // Event type filter
    if (filter.event_type.length > 0) {
      const typeMatch = filter.event_type.includes(event["event_type"]);
      if (!typeMatch) return false;
    }

    // Categories filter
    if (filter.category.length > 0) {
      const categoryMatch = filter.category.some((category: any) =>
        event["categories"].includes(category)
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
  };
};

export const FilterSummary = () => {
  return (
    <div className={filterCss["active-filters"]}>
      <p className="small-text">Active filter:</p>
      <p className="bold tiny-text">
        Filter summary (...)
        {/* {(() => {
          const {
            categoryFilter,
            difficultyFilter,
            statusFilter,
            hideSoldOut,
            showFavorites,
            showOnlyDomainSpecific,
          } = filterAttributes;

          const computeFilterShorthand = (key: string, filters: string[]) => {
            if (filters.length === 0) return;
            if (filters.length === 1) return filters[0];

            return `${key} (${filters.length})`;
          };

          return (
            [
              computeFilterShorthand("Categories", categoryFilter),
              computeFilterShorthand("Experience", difficultyFilter),
              showFavorites ? "Favorites" : null,
              computeFilterShorthand("Status", statusFilter),
              hideSoldOut ? "Not sold out" : null,
              ,
              showOnlyDomainSpecific ? "Ecosystem" : null,
              ,
            ]
              .filter((val) => !!val)
              .join(", ") || "None"
          );
        })()} */}
      </p>
    </div>
  );
};

export const Filter = ({
  filterOpen,
  setFilterOpen,
  events,
  filterableValues,
  keysToFilterOn,
  filter,
  setFilter,
}: {
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  events: any[];
  filterableValues: any;
  keysToFilterOn: string[];
  filter: any;
  setFilter: (filterKey: string, nextValue: any) => void;
}) => {
  const filterableValuesKeys = Array.from(Object.keys(filterableValues));

  console.log(filterableValuesKeys, "hello keys");

  return (
    <div className={cn(filterCss["filter-foldout"], "w-64 p-4")}>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center w-full">
          <div className="text-sm font-medium">Refine your search</div>
          <div
            className="text-sm font-medium cursor-pointer"
            onClick={() => setFilterOpen(false)}
          >
            <X size={16} />
          </div>
        </div>
        {filterableValuesKeys.map((key) => {
          const valuesForFilter = Array.from(filterableValues[key]);
          console.log(valuesForFilter, "hello values");
          // Map event property keys to filter state keys
          const filterStateKey = key === "categories" ? "category" : key;
          const activeFilters = filter[filterStateKey] || [];

          if (valuesForFilter.length === 0) return null;

          return (
            <div key={key}>
              <div className="text-sm font-medium capitalize">
                {key.replace("_", " ")}
              </div>
              <div className="flex flex-col gap-2">
                {Array.from(valuesForFilter).map((value: any) => {
                  const isSelected = Array.isArray(activeFilters)
                    ? activeFilters.includes(value)
                    : activeFilters === value;

                  return (
                    <div
                      key={value}
                      className={cn(
                        "text-sm cursor-pointer px-2 py-1 rounded transition-colors select-none",
                        isSelected
                          ? "bg-blue-100 text-blue-800 font-medium"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => setFilter(filterStateKey, value)}
                    >
                      {value}
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
