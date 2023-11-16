import React from "react";
import css from "./infinite-scroll.module.scss";

type InfiniteScrollProps = {
  // May have to repeat content more than twice if there isn't a lot to loop over
  nDuplications?: number;
  speed?: string;
};

const InfiniteScroll = (props: any) => {
  let className = css["marquee"];

  if (props.slow) className += ` ${css["slow"]}`;
  if (props.unpadded) className += ` ${css["unpadded"]}`;

  const nDuplications = props.nDuplications || 2;

  return (
    <div className={css["wrap"]} style={{ "--override-speed": props.speed }}>
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
