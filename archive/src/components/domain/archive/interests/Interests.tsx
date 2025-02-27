import React from "react";
import css from "./interests.module.scss";
import { chunkArray } from "@/utils/format";
import { TRACKS } from "@/utils/config";
import { Link } from "@/components/common/link";

export const Interests = () => {
  const tagRows = chunkArray(TRACKS, 1);

  return (
    <div className="section">
      <div className={`${css["container"]} content padding-bottom`}>
        <div className={css["header"]}>
          <h2 className={`bold font-xl font-primary ${css["title"]}`}>
            Explore Devcon Archive —
          </h2>
          <p className="font-sm">
            Dive into the immersive world of Devcon content by selecting topics
            most relevant to your interest.
          </p>
          <p className={css["unicorn"]}>✨🦄</p>
        </div>

        <div className={css["tags-container"]}>
          <p className="bold font-sm">Choose Category</p>
          {tagRows.map((tagRow, index) => {
            return (
              <div key={index} className={css["tags"]}>
                {tagRow.map((tag) => {
                  let className = `${css["tag"]} label label-hover plain white`;
                  return (
                    <Link
                      className={className}
                      key={tag}
                      href={`/watch?tags=${encodeURIComponent(tag)}`}
                    >
                      <span>{tag}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
