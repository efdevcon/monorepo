import InfiniteScroll from "./infinite-scroll";
import css from "./scrolling-text.module.scss";
import cn from "classnames";

interface ScrollingTextProps {
  children?: React.ReactNode;
  className?: string;
  color?: string;
  direction?: "up" | "down";
  reverse?: boolean;
  speed?: string;
}

const ScrollingText = ({
  children,
  className,
  color,
  direction,
  speed,
  reverse,
}: ScrollingTextProps) => {
  return (
    <div
      className={cn(
        css["scrolling-text-background"],
        css[color || "blue"],
        css[direction || "down"],
        className
      )}
    >
      {children && (
        <InfiniteScroll
          nDuplications={2}
          speed={speed || "140s"}
          reverse={reverse}
        >
          <p>{children}</p>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default ScrollingText;
