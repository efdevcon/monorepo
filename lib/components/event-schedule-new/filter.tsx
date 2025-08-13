import { useState } from "react";
import filterCss from "./filter.module.scss";
import cn from "classnames";
import { X } from "lucide-react";

export const useFilters = (events: any[]) => {
  //   const [selectedFilter, setSelectedFilter] = useState<string>("");

  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const keysToFilterOn = ["event_type", "difficulty", "categories"];
  const [categoryFilter, setCategoryFilter] = useState<any>([]);
  const [statusFilter, setStatusFilter] = useState<any>([]);
  const [difficultyFilter, setDifficultyFilter] = useState([]);
  const filterableValues = {} as { [key: string]: Set<string> };
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [showOnlyDomainSpecific, setShowOnlyDomainSpecific] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [textSearch, setTextSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState([]);

  // // Localstorage sync here
  // React.useEffect(() => {
  //   // localStorage blabla
  //   console.log('filter updated sync localstorage')
  // }, [showFavorites, showOnlyDomainSpecific, hideSoldOut, textSearch])

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
    // if (
    //   hideSoldOut &&
    //   ["sold out", "applications closed"].includes(
    //     event["Attend"] && event["Attend"].toLowerCase()
    //   )
    // ) {
    //   return false;
    // }

    if (
      textSearch.length > 0 &&
      !event.Name.toLowerCase().includes(textSearch.toLowerCase())
    )
      return false;

    // Difficulty filter
    if (difficultyFilter.length > 0) {
      // @ts-ignore
      const difficultyMatch = difficultyFilter.includes(event["difficulty"]);

      if (!difficultyMatch) return false;
    }

    // Event type filter
    if (typeFilter.length > 0) {
      // @ts-ignore
      const typeMatch = typeFilter.includes(event["event_type"]);

      if (!typeMatch) return false;
    }

    // Categories filter
    if (categoryFilter.length > 0) {
      const categoryMatch = categoryFilter.some((category: any) =>
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
    setTextSearch,
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
}: {
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  events: any[];
  filterableValues: any;
  keysToFilterOn: string[];
}) => {
  const filterableValuesKeys = Array.from(Object.keys(filterableValues));

  return (
    <div className={cn(filterCss["filter-foldout"], "w-64 p-4")}>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center w-full">
          <div className="text-sm font-medium">Refine your search</div>
          <div
            className="text-sm font-medium"
            onClick={() => setFilterOpen(false)}
          >
            <X size={16} />
          </div>
        </div>
        {filterableValuesKeys.map((key) => {
          const valuesForFilter = filterableValues[key];

          if (valuesForFilter.size === 0) return null;

          return (
            <div key={key}>
              <div className="text-sm font-medium">{key}</div>
              <div className="flex flex-col gap-2">
                {Array.from(valuesForFilter).map((value: any) => (
                  <div key={value} className="text-sm">
                    {value}
                  </div>
                ))}
              </div>
              {/* <div className="flex flex-col gap-2">
              {filterableValues[key].map((value: any) => (
                <div key={value} className="text-sm">
                  {value}
                </div>
              ))}
            </div> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};
