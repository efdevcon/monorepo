"use client"

import React from "react";
import { useCallback } from "react";
import { useGesture } from "react-use-gesture";
import css from "./horizontal-scroller.module.scss";
import useIsTouchDevice from "lib/hooks/useIsTouchDevice";
import ChevronRight from "lib/assets/icons/chevron_right.svg";
import ChevronLeft from "lib/assets/icons/chevron_left.svg";

// Dragging shouldn't lead to a click
const usePreventClickWhileDragging = (elementRef: any, threshold = 10) => {
  const preventClick = React.useRef(false);
  const deltaX = React.useRef(0);
  const initialX = React.useRef(0);

  // Have to add events directly to the DOM node itself
  React.useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      preventClick.current = false;

      initialX.current = e.clientX;
    };
    const handleMove = (e: MouseEvent) => {
      preventClick.current = true;

      deltaX.current = Math.abs(initialX.current - e.clientX);
    };
    const handleClick = (e: Event) => {
      if (preventClick.current && deltaX.current > threshold) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    elementRef.current.addEventListener("mousedown", handleDown);
    elementRef.current.addEventListener("mousemove", handleMove);
    elementRef.current.addEventListener("click", handleClick);

    // Have to keep the reference alive to remove event listeners
    const el = elementRef.current;

    return () => {
      el.removeEventListener("mousedown", handleDown);
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("click", handleClick);
    };
  }, [elementRef, threshold]);
};

export const HorizontalScroller = (props: any) => {
  const elementRef = React.useRef<any>(null);
  const elementWidth = React.useRef(0);
  const scrollWidth = React.useRef(0);
  const scrolledBy = React.useRef(0);
  const isTouchDevice = useIsTouchDevice();
  const [indicatorVisibleLeft, setIndicatorVisibleLeft] = React.useState(false);
  const [indicatorVisibleRight, setIndicatorVisibleRight] =
    React.useState(false);

  usePreventClickWhileDragging(elementRef);

  const syncIndicators = useCallback(() => {
    const contentOverflowing = scrollWidth.current > elementWidth.current;

    if (contentOverflowing) {
      const isScrolledToEnd =
        scrolledBy.current + elementWidth.current >= scrollWidth.current;
      const isScrolled = scrolledBy.current > 0;

      if (isScrolledToEnd) {
        setIndicatorVisibleRight(false);
      } else {
        setIndicatorVisibleRight(true);
      }

      if (isScrolled) {
        setIndicatorVisibleLeft(true);
      } else {
        setIndicatorVisibleLeft(false);
      }
    } else {
      setIndicatorVisibleRight(false);
      setIndicatorVisibleLeft(false);
    }
  }, []);

  const bind = useGesture(
    {
      onDrag: (state) => {
        const [deltaX] = state.delta;
        const nextX = Math.min(
          scrollWidth.current - elementWidth.current,
          Math.max(0, scrolledBy.current - deltaX)
        );

        scrolledBy.current = nextX;

        elementRef.current.style.transform = `translateX(-${nextX}px)`;
        elementRef.current.style.cursor = "grab";
        elementRef.current.style.transition = "none";
        // elementRef.current.style['touch-action'] = 'none'
      },
      onScroll: (state) => {
        scrolledBy.current = state.values[0];

        syncIndicators();
      },
      onDragEnd: () => {
        elementRef.current.style.transition = "";
        elementRef.current.style.cursor = "";
        // elementRef.current.style['touch-action'] = ''
      },
    },
    { drag: { useTouch: true, threshold: 20 } }
  );

  React.useEffect(() => {
    if (window.ResizeObserver) {
      const el = elementRef.current;
      if (!el) return;

      const observer = new window.ResizeObserver((entries) => {
        const entry = entries[0];

        scrollWidth.current = Math.round(el.scrollWidth);

        if (entry.borderBoxSize) {
          const borderBoxSize = entry.borderBoxSize[0] || entry.borderBoxSize;

          elementWidth.current = Math.round(borderBoxSize.inlineSize);
        } else {
          elementWidth.current = Math.round(el.offsetWidth);
        }

        scrolledBy.current = 0;
        el.style.transform = `translateX(0px)`;

        syncIndicators();
      });

      observer.observe(el);

      return () => {
        observer.unobserve(el);
      };
    }
  }, [syncIndicators]);

  const goToEnd = () => {
    if (isTouchDevice) {
      elementRef.current.scroll(scrollWidth.current, 0);
    } else {
      const nextX = scrollWidth.current - elementWidth.current;

      scrolledBy.current = nextX;

      elementRef.current.style.transform = `translateX(-${nextX}px)`;
    }

    syncIndicators();
  };

  const goToStart = () => {
    if (isTouchDevice) {
      elementRef.current.scroll(0, 0);
    } else {
      scrolledBy.current = 0;

      elementRef.current.style.transform = `translateX(0px)`;
    }

    syncIndicators();
  };

  let className = css["horizontal-scroller"];
  let indicatorsClassName = css["indicators"];

  if (
    (typeof window !== "undefined" && !window.ResizeObserver) ||
    isTouchDevice
  )
    className += ` ${css["native-drag"]}`;
  if (indicatorVisibleRight)
    indicatorsClassName += ` ${css["indicator-right"]}`;
  if (indicatorVisibleLeft) indicatorsClassName += ` ${css["indicator-left"]}`;

  return (
    <div className={indicatorsClassName}>
      <div className={css["left"]} onClick={goToStart}>
        <ChevronLeft />
      </div>
      <div
        className={className}
        {...bind()}
        ref={elementRef}
        data-type="horizontal-scroller"
      >
        {props.children}
      </div>
      <div className={css["right"]} onClick={goToEnd}>
        <ChevronRight />
      </div>
    </div>
  );
};
