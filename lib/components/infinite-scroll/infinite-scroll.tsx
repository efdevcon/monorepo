import React from "react";
import css from "./infinite-scroll.module.scss";

const InfiniteScroll = (props: any) => {
  let className = css["marquee"];

  if (props.slow) className += ` ${css["slow"]}`;
  if (props.unpadded) className += ` ${css["unpadded"]}`;

  const nDuplications = props.nDuplications || 2;

  return (
    <div className={css["wrap"]}>
      <div className={className}>
        {Array.from(
          Array(nDuplications)
            .fill(null)
            .map((_) => {
              return props.children;
            })
        )}
      </div>
    </div>
  );
};

export default InfiniteScroll;
