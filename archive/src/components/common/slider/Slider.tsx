"use client";

import React from "react";
import { Button } from "@/components/common/button";
import SlickSlider from "react-slick";
import ChevronLeft from "@/assets/icons/chevron_left.svg";
import ChevronRight from "@/assets/icons/chevron_right.svg";
import css from "./slider.module.scss";

export const useSlider = (settings: any) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [cardsPerSlide, setCardsPerSlide] = React.useState(0);
  const sliderRef = React.useRef<SlickSlider>(null);

  const nCards = (() => {
    var counter = 0;

    if (sliderRef.current) {
      React.Children.forEach(
        sliderRef.current.props.children,
        function (child) {
          if (child) counter++;
        }
      );
    }

    return counter;
  })();

  const canNext = currentIndex < nCards - cardsPerSlide;
  const canBack = currentIndex > 0;

  return [
    {
      ...settings,
      beforeChange: (_: any, next: number) => {
        if (setCurrentIndex) setCurrentIndex(next);
      },
      onReInit: () => {
        if (!sliderRef.current) return;
        if (!settings.responsive) return;

        const { state } = sliderRef.current as any;

        const currentBreakpoint = state.breakpoint;
        const breakpoints = settings.responsive;

        const activeBreakpoint =
          breakpoints?.find(({ breakpoint }: any) => {
            return breakpoint === currentBreakpoint;
          })?.settings || settings;

        const nextCardsPerSlide = activeBreakpoint?.slidesToShow;

        if (cardsPerSlide !== nextCardsPerSlide)
          setCardsPerSlide(nextCardsPerSlide);
      },
    },
    {
      currentIndex,
      cardsPerSlide,
      nCards,
      canNext,
      canBack,
      canSlide: canNext || canBack,
      setCurrentIndex,
      setCardsPerSlide,
      sliderRef,
    },
  ];
};

const Arrows = (props: any) => {
  let className = `squared sm black ${css["arrow-button"]}`;

  const canNext = props.currentIndex < props.nCards - props.cardsPerSlide;
  const canBack = props.currentIndex > 0;

  if (!canNext && !canBack) return null;

  return (
    <div className={css["arrows"]}>
      <Button
        disabled={!canBack}
        className={className}
        aria-label="Slide left"
        onClick={() => props.sliderRef.current?.slickPrev()}
      >
        <ChevronLeft />
      </Button>

      <Button
        disabled={!canNext}
        className={className}
        aria-label="Slide right"
        onClick={() => props.sliderRef.current?.slickNext()}
      >
        <ChevronRight />
      </Button>
    </div>
  );
};

type SliderProps = {
  sliderProps: any;
  className?: string;
  children?: React.ReactNode;
  style?: {
    [key: string]: any;
  };
  // custom?: () => React.ReactNode
  title: string;
};

export const Slider = (props: SliderProps) => {
  const [settings, sliderState] = props.sliderProps;

  return (
    <div className={css["container"]} style={props.style}>
      <div className={css["top-section"]}>
        <h3 className="title">{props.title}</h3>

        <Arrows {...sliderState} />
      </div>

      <div className={`${props.className} ${css["children"]}`}>
        <SlickSlider ref={sliderState.sliderRef} {...settings}>
          {props.children}
        </SlickSlider>
      </div>
    </div>
  );
};
