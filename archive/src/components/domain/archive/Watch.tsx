"use client";

import React, { useState } from "react";
import css from "./watch.module.scss";
import { VideoCard } from "@/components/domain/archive/VideoCard";
import { useSort, SortVariation, Sort } from "@/components/common/sort";
import IconGrid from "@/assets/icons/grid.svg";
import IconFilter from "@/assets/icons/filter.svg";
import IconListView from "@/assets/icons/list-view.svg";
import {
  VideoFilter,
  useVideoFilter,
  VideoFilterMobile,
} from "./watch/VideoFilter";
import { useEffect } from "react";
import { useArchiveSearch } from "@/hooks/useArchiveSearch";
import { Pagination } from "@/components/common/pagination";
import { useQueryStringer } from "@/hooks/useQueryStringer";
import { Loader } from "@/components/common/loader";

type WatchProps = {};

export const Watch = (props: WatchProps) => {
  const [gridViewEnabled, setGridViewEnabled] = React.useState(true);
  const videoContainerElement = React.useRef<any>();
  const [from, setFrom] = useState(0);
  const defaultPageSize = 12;
  const filterState = useVideoFilter();
  const sortState = useSort(
    [],
    [
      {
        title: "Event",
        key: "eventId",
        sort: SortVariation.basic,
      },
      {
        title: "Alphabetical",
        key: "title",
        sort: SortVariation.basic,
      },
      {
        title: "Duration",
        key: "duration",
        sort: SortVariation.date,
      },
    ],
    false,
    "desc"
  );

  const qs = useQueryStringer(
    {
      event: filterState.editionFilterState?.activeFilter,
      tags: filterState.tagsFilterState?.activeFilter,
      expertise: filterState.expertiseFilterState?.activeFilter,
      type: filterState.typeFilterState?.activeFilter,
      sort: sortState.fields[sortState.sortBy].key,
      order: sortState.sortDirection,
      q: filterState.searchFilterState?.activeFilter,
    },
    true
  );

  const { data, isLoading, isError } = useArchiveSearch(qs, {
    from: from,
    size: defaultPageSize,
  });

  // Reset pagination on filter change
  useEffect(() => {
    setFrom(0);
  }, [
    filterState.editionFilterState?.activeFilter,
    filterState.tagsFilterState?.activeFilter,
    filterState.expertiseFilterState?.activeFilter,
    filterState.typeFilterState?.activeFilter,
    filterState.searchFilterState?.activeFilter,
    sortState.fields[sortState.sortBy].key,
    sortState.sortDirection,
  ]);

  function onSelectPagination(nr: number) {
    const from = (nr - 1) * defaultPageSize;
    setFrom(from);
  }

  const noResults = data && data.items && data.items.length === 0;

  return (
    <div className="section">
      <div className={`${css["container"]} content`}>
        {/* Hide header div on Mobile */}
        <div className={`${css["header"]}`}>
          <div className={`${css["filter"]}`}>
            <p className="title">Filter</p>
            <IconFilter />
          </div>
          <div className={`${css["sort"]}`}>
            <Sort {...sortState} />

            <div className={css["view-toggle"]}>
              <IconGrid
                onClick={() => setGridViewEnabled(true)}
                className={`${gridViewEnabled ? "" : css["faded"]} icon`}
              />
              <IconListView
                onClick={() => setGridViewEnabled(false)}
                className={`${gridViewEnabled ? css["faded"] : ""} icon`}
              />
            </div>
          </div>
        </div>

        <VideoFilterMobile {...filterState} />

        <div id="filter-sort" className={`${css["sort"]} ${css["mobile"]}`}>
          <Sort {...sortState} />
        </div>

        <div className={`${css["view"]}`}>
          <div className={`${css["filter"]}`}>
            <VideoFilter {...filterState} />
          </div>
          <div
            className={`${css["videos"]} ${
              noResults || isError ? css["no-results"] : ""
            }`}
            ref={videoContainerElement}
          >
            {(noResults || isError) && (
              <div className={css["no-results-container"]}>
                <div className={css["no-results-image-container"]}>
                  {/* TODO: Add image */}

                  {isError ? (
                    <p className="font-xxl bold">Error - come back later</p>
                  ) : (
                    <>
                      <p className="font-xxl bold">Sorry No Results Found</p>
                      <p>Please try another search string</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <Loader
              loading={isLoading}
              error={isError}
              noResults={data && data.items && data.items.length === 0}
              messages={{
                error: {
                  message: "Could not fetch results - try again later.",
                },
                loading: {
                  message: "Applying filter...",
                },
                noResults: {
                  message: "No results matching this filter - try another",
                },
              }}
            />

            {data && data.items && (
              <>
                <div
                  className={`${gridViewEnabled ? "" : css["list-view"]} ${
                    css["video-list"]
                  }`}
                >
                  {data.items.map((i: any, index: number) => {
                    return (
                      <VideoCard
                        key={index}
                        horizontal={!gridViewEnabled}
                        video={i}
                      />
                    );
                  })}
                </div>

                <div className={`${css["video-list"]} ${css["mobile"]}`}>
                  {data.items.map((i: any, index: number) => {
                    return (
                      <VideoCard
                        key={index}
                        horizontal
                        vertical={index === 0}
                        video={i}
                      />
                    );
                  })}
                </div>

                {data.total > data.items.length && (
                  <div className={css["footer"]}>
                    <Pagination
                      itemsPerPage={defaultPageSize}
                      totalItems={data.total}
                      selectedPage={data.currentPage}
                      onSelectPage={onSelectPagination}
                      truncate={true}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
