import React, { forwardRef, useEffect, useImperativeHandle } from "react";
import css from "./sts.module.scss";
import { useDrag } from "react-use-gesture";
import useDimensions from "react-cool-dimensions";

type SwipeToScrollProps = {
  noBounds?: boolean;
  noScrollReset?: boolean;
  speed?: number;
  focusRef?: React.RefObject<HTMLElement>;
  syncElement?: React.RefObject<any>;
  children: React.ReactNode | React.ReactNode[];
  scrollIndicatorDirections?: {
    ["left"]?: boolean;
    ["right"]?: boolean;
  };
  alwaysShowscrollIndicators?: boolean;
};

const SwipeToScroll = forwardRef(
  (props: SwipeToScrollProps, ref: React.Ref<any>) => {
    const el = React.useRef<HTMLDivElement | null>(null);
    const containerEl = React.useRef<HTMLDivElement | null>(null);
    const [maxScroll, setMaxScroll] = React.useState(0);
    const [isNativeScroll, setIsNativeScroll] = React.useState(true);
    const [scrollIndicatorClass, setScrollIndicatorClass] = React.useState("");
    const lastX = React.useRef(0);

    // Whether or not to display a scroll indicator
    const syncScrollIndicators = React.useCallback(
      (scrollContainer: HTMLDivElement) => {
        const threshold = 5; // Add a threshold for when a container is "barely" scrollable - if its just a few pixels then it feels weird to have the indicator there
        let showIndicatorRight = false;
        let showIndicatorLeft = false;
        const leftEnabled = !!props.scrollIndicatorDirections?.left;
        const rightEnabled = !!props.scrollIndicatorDirections?.right;

        // On mobile we use native scrolling for better UX - as a result, the logic for whether or not we show scroll indicators also changes:
        if (isNativeScroll) {
          const canScrollRightNative =
            scrollContainer.scrollLeft <
            scrollContainer.scrollWidth -
              scrollContainer.clientWidth -
              threshold;
          const canScrollLeftNative = scrollContainer.scrollLeft > threshold;

          showIndicatorRight = canScrollRightNative && rightEnabled;
          showIndicatorLeft = canScrollLeftNative && leftEnabled;
        } else {
          const canScrollRight = lastX.current < maxScroll - threshold;
          const canScrollLeft = lastX.current > threshold;

          showIndicatorRight = canScrollRight && rightEnabled;
          showIndicatorLeft = canScrollLeft && leftEnabled;
        }

        const canScroll =
          scrollContainer.scrollWidth > scrollContainer.clientWidth + threshold;

        if (showIndicatorLeft && showIndicatorRight) {
          setScrollIndicatorClass(css["mask-both"]);
        } else if (showIndicatorRight) {
          setScrollIndicatorClass(css["mask-right"]);
        } else if (showIndicatorLeft) {
          setScrollIndicatorClass(css["mask-left"]);
        } else {
          setScrollIndicatorClass("");
        }

        // We have a case where we want to always show the scroll indicator in a direction regardless of whether or not we are fully scrolled:
        if (props.alwaysShowscrollIndicators) {
          if (leftEnabled && rightEnabled) {
            setScrollIndicatorClass(css["mask-both"]);
          } else if (rightEnabled) {
            setScrollIndicatorClass(css["mask-right"]);
          } else if (leftEnabled) {
            setScrollIndicatorClass(css["mask-left"]);
          }

          return;
        }

        if (!canScroll) {
          setScrollIndicatorClass("");
        }
      },
      [
        maxScroll,
        props.alwaysShowscrollIndicators,
        props.scrollIndicatorDirections,
        isNativeScroll,
      ]
    );

    // useEffect(() => {
    //   if (props.syncElement?.current) {
    //     if (isNativeScroll) {
    //       props.syncElement.current.style.overflowX = 'auto';
    //       props.syncElement.current.style.transform = 'translateX(0px) !important';
    //     } else {
    //       props.syncElement.current.style.overflowX = '';
    //       props.syncElement.current.style.transform = '';
    //     }
    //   }
    // }, [isNativeScroll]);

    const reset = React.useCallback(() => {
      if (el.current) {
        const scrollContainer = el.current;
        lastX.current = 0;
        scrollContainer.style.transform = `translateX(0px)`;

        if (props.syncElement?.current) {
          // props.syncElement.current.style.transform = `translateX(0px)`;
          props.syncElement.current.style.setProperty("--scroll-x", "0px");
        }

        syncScrollIndicators(scrollContainer);
      }
    }, [syncScrollIndicators]);

    // When element changes size, record its max scroll boundary and reset all scroll related state to avoid edge cases
    const { observe } = useDimensions({
      onResize: ({ width }) => {
        const isNativeScroll = !window.matchMedia("not all and (hover: none)")
          .matches;

        setIsNativeScroll(isNativeScroll);

        if (!props.noScrollReset) {
          reset();
        }

        if (el.current && el.current.scrollWidth) {
          const maxScroll = el.current.scrollWidth - width;

          setMaxScroll(maxScroll);
        }
      },
    });

    // When window changes size, reset
    React.useEffect(() => {
      if (!props.noScrollReset) return;

      const resizeListener = reset;

      window.addEventListener("resize", resizeListener);

      return () => {
        window.removeEventListener("resize", resizeListener);
      };
    }, [reset]);

    // Create the setScroll function, which is memoized and depends on maxScroll
    const setScrollRef = React.useRef<(element: HTMLElement) => void>(() => {});

    const setScroll = React.useCallback(
      (element: HTMLElement) => {
        if (el.current) {
          const scrollContainer = el.current;
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          const scrollLeft =
            elementRect.left -
            containerRect.left +
            scrollContainer.scrollLeft -
            containerRect.width / 2 +
            elementRect.width / 2;

          const clampedScrollLeft = Math.max(
            0,
            Math.min(scrollLeft, maxScroll)
          );

          if (isNativeScroll) {
            // Use native scrolling for devices without a cursor
            scrollContainer.scrollTo({
              left: clampedScrollLeft, // elementRect.left - 16,
              behavior: "smooth",
            });

            if (props.syncElement?.current) {
              props.syncElement.current.scrollTo({
                left: clampedScrollLeft,
                behavior: "smooth",
              });
            }
          } else {
            // Use translateX for devices with a cursor
            scrollContainer.style.transform = `translateX(-${clampedScrollLeft}px)`;

            if (props.syncElement?.current) {
              // props.syncElement.current.style.transform = `translateX(-${clampedScrollLeft}px)`;
              props.syncElement.current.style.setProperty(
                "--scroll-x",
                `-${clampedScrollLeft}px`
              );
            }
          }

          lastX.current = clampedScrollLeft;

          syncScrollIndicators(scrollContainer);
        }
      },
      [maxScroll, syncScrollIndicators, isNativeScroll]
    );

    // Store the latest `setScroll` in the ref
    setScrollRef.current = setScroll;

    useImperativeHandle(ref, () => ({
      setScroll: (element: HTMLElement) => {
        setScrollRef.current(element);
      },
    }));

    const bind = useDrag(({ down, delta }) => {
      const scrollContainer = el.current!;

      const speed = props.speed || 1.5;

      lastX.current = Math.min(
        Math.max(0, lastX.current - delta[0] * speed),
        maxScroll
      );
      scrollContainer.style.transform = `translateX(-${lastX.current}px)`;

      if (props.syncElement?.current) {
        // props.syncElement.current.style.transform = `translateX(-${lastX.current}px)`;
        props.syncElement.current.style.setProperty(
          "--scroll-x",
          `-${lastX.current}px`
        );
      }

      if (down) {
        containerEl.current!.style.cursor = "grabbing";
      } else {
        containerEl.current!.style.cursor = "auto";
      }
    });

    let className = `${css["container"]}`;

    if (scrollIndicatorClass) className += ` ${scrollIndicatorClass}`;
    if (props.noBounds) className += ` ${css["no-bounds"]}`;

    let scrollContainerClass = "h-full select-none";

    if (isNativeScroll)
      scrollContainerClass += " overflow-x-auto !translate-x-0";

    return (
      <div
        {...bind()}
        ref={containerEl}
        className={className}
        data-type="swipe-to-scroll-container"
      >
        <div
          ref={(element) => {
            el.current = element!;
            observe(element);
          }}
          className={scrollContainerClass}
          onScroll={(e) => {
            if (props.syncElement?.current) {
              // @ts-ignore
              props.syncElement.current.scrollLeft = e.target.scrollLeft;
              // props.syncElement.current.style.setProperty('--scroll-x', `-${e.target.scrollLeft}px`);
            }
          }}
          // This prevents selection (text, image) while dragging
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {props.children}
        </div>
      </div>
    );
  }
);

export default SwipeToScroll;
