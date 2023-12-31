import React from "react";
import { motion } from "framer-motion";

// Size: font size, padding, height/width

type ColorType = "opaque" | "purple" | "red" | "light-purple";
type SizeType = "sm" | "md" | "lg";

type ButtonProps = {
  rounded?: boolean;
  circle?: boolean;
  square?: boolean;
  borderless?: boolean;
  fill?: boolean;
  size?: SizeType;
  color?: ColorType;
  [key: string]: any;
};

export const colors = {
  opaque: {
    border: "b-[#9FA1B7]",
    background: "bg-[transparent]",
    text: "text-[#9FA1B7]",
    hover: "#9fa1b730",
    icon: "#9FA1B7",
  },
  purple: {
    border: "b-[#9FA1B7]",
    background: "bg-[#ffffff0]",
    text: "text-[#9FA1B7]",
    hover: "#9fa1b730",
    icon: "#9FA1B7",
  },
  red: {
    border: "b-[purple]",
    background: "bg-[#dcdeff]",
    text: "text-[blue]",
    hover: "#dcdeff20",
    icon: "#9FA1B7",
  },
} as {
  [K in ColorType]: {
    border: string;
    background: string;
    text: string;
    hover: string;
    icon: string;
  };
};

export const sizes = {
  sm: {
    text: "text-sm",
    icon: "[&>svg]:text-[0.85em]",
    padding: "py-1 px-2",
  },
  md: {
    text: "text-md",
    icon: "[&>svg]:text-[0.825em]",
    padding: "py-1 px-2.5",
  },
  lg: {
    text: "text-lg",
    icon: "[&>svg]:text-[0.8em]",
    padding: "py-1 px-3",
  },
} as {
  [K in SizeType]: {
    text: string;
    padding: string;
    icon: string;
  };
};

const applySize = (
  size: ButtonProps["size"] = "md",
  square?: boolean,
  circle?: boolean
) => {
  const sizeClasses = [];
  const { icon, text, padding } = sizes[size];

  sizeClasses.push(text);

  if (square || circle) {
    sizeClasses.push("h-[2.5em] w-[2.5em]");

    if (circle) sizeClasses.push("rounded-full");
  } else {
    sizeClasses.push(icon);
    sizeClasses.push(padding);
  }

  return sizeClasses.join(" ");
};

const applyColor = (
  color: ColorType = "opaque",
  fill?: boolean,
  borderless?: boolean
) => {
  const colorClasses = [];
  const { border, background, text } = colors[color];

  if (fill) colorClasses.push(background);
  if (!borderless) colorClasses.push(border);
  colorClasses.push(text);

  return colorClasses.join(" ");
};

export const Button = (props: ButtonProps) => {
  const {
    className: classNameFromProps,
    rounded = true,
    circle,
    square,
    fill,
    color = "opaque",
    borderless,
    size,
    style,
    ...rest
  } = props;

  const classComponents = [
    "inline-flex items-center justify-center",
    borderless ? "" : "border border-solid",
    rounded ? "rounded-md" : "",
    applyColor(color, fill, borderless),
    applySize(size, square, circle),
  ];

  let className = classComponents.join(" ");

  if (classNameFromProps) className += ` ${classNameFromProps}`;

  const chosenColor = colors[color];

  return (
    <motion.button
      className={className}
      whileHover={{ backgroundColor: chosenColor.hover }}
      style={
        {
          "--color-icon": chosenColor.icon,
          "--icon-color": chosenColor.icon,
          ...style,
        } as any
      }
      {...rest}
    >
      {props.children}
    </motion.button>
  );
};

/*
  <Button

  >

  </Button>
*/

/*
  Sizes

  Colors

  types:
    Rounded
    Squared
    Icon support
    Centering
*/

// let className = `border-2 w-[40px] h-[40px] border-solid ${css['arrow-button']}`
// <motion.button
//   disabled={!canBack}
//   className={className}
//   initial={{
//     background: '#ffffff80',
//   }}
//   whileHover={{
//     background: '#9fa1b730',
//   }}
//   aria-label="Slide left"
//   onClick={() => props.sliderRef.current?.slickPrev()}
// >
//   <ChevronLeft />
// </motion.button>
