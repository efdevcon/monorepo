"use client";

import React, { useState } from "react";
import { InputForm } from "@/components/common/input-form";
import { Link } from "@/components/common/link";
import { useArchiveSearch } from "@/hooks/useArchiveSearch";
import IconSearch from "@/assets/icons/search.svg";
import css from "./search.module.scss";
import { useRouter } from "next/navigation";

export const Search = (props: any) => {
  let className = css["search-foldout"];
  if (props.open) {
    className += ` ${css["open"]}`;
  }

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError } = useArchiveSearch("", {
    q: searchQuery || "Keynote:",
    size: 6,
  });

  function onSearch() {
    router.push(`/watch?q=${searchQuery}`);
  }

  return (
    <div className={className}>
      <div className={`${css["content"]}`}>
        <InputForm
          id="input-form_search_header"
          type="search"
          placeholder="Search for videos.."
          icon={IconSearch}
          className={css["search-input"]}
          timeout={300}
          onChange={(e) => setSearchQuery(e)}
          onSubmit={onSearch}
          transparentMode
          autoFocus={props.open}
        />

        <div className={css["results"]}>
          <p className="text-uppercase font-xs bold">Suggested</p>

          {isLoading && <p className={css["result"]}>Loading results..</p>}
          {isError && <p className={css["result"]}>Unable to fetch videos..</p>}
          {data?.items?.length === 0 && (
            <p className={css["result"]}>No videos found..</p>
          )}
          {data?.items?.length > 0 &&
            data.items.map((i: any) => {
              return (
                <Link
                  key={i.id}
                  href={`/${i.eventId}/${i.id}`}
                  className={`${css["result"]} hover-underline`}
                >
                  <IconSearch />
                  <p>{i.title}</p>
                </Link>
              );
            })}

          <Link
            href={`/watch?q=${searchQuery}`}
            className={`${css["result"]} bold text-underline"`}
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
};
