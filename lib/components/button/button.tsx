import React from "react";
import { motion } from "framer-motion";
import css from "./button.module.scss";

type ColorType =
  | "default"
  | "black-1"
  | "purple-1"
  | "green-1"
  | "blue-1"
  | "teal-1"
  | "orange-1";
type SizeType = "sm" | "md" | "lg";

type ButtonProps = {
  rounded?: boolean;
  circle?: boolean;
  square?: boolean;
  fill?: boolean;
  fat?: boolean;
  size?: SizeType;
  color?: ColorType;
  [key: string]: any;
};

type ColorProps = {
  color: string;
  background: string;
  hover: string;
  border?: string;
};

export const colors = {
  default: {
    fill: {
      color: "#ffffff",
      background: "#9FA1B7",
      hover: "#9FA1B720",
    },
    ghost: {
      color: "#9FA1B7",
      hover: "#9FA1B720",
    },
  },
  "black-1": {
    fill: {
      color: "#ffffff",
      background: "#454545",
      hover: "#2e2c2c",
    },
    ghost: {
      color: "#88c43f",
      hover: "#88c43f20",
    },
  },
  "purple-1": {
    fill: {
      color: "#ffffff",
      background: "#8c72ae",
      hover: "#695583",
    },
    ghost: {
      color: "#8c72ae",
      hover: "#8c72ae20",
    },
  },
  "blue-1": {
    fill: {
      color: "#ffffff",
      background: "#1B6FAE",
      hover: "#448dc3",
    },
    ghost: {
      color: "#1B6FAE",
      hover: "#1B6FAE20",
    },
  },
  "teal-1": {
    fill: {
      color: "#ffffff",
      background: "#00B3A4",
      hover: "#008176",
    },
    ghost: {
      color: "#00B3A4",
      hover: "#00B3A420",
    },
  },
  "green-1": {
    fill: {
      color: "#ffffff",
      background: "#88c43f",
      hover: "#40ad2e",
    },
    ghost: {
      color: "#88c43f",
      hover: "#88c43f20",
    },
  },
  "orange-1": {
    fill: {
      color: "#ffffff",
      background: "#EA766E",
      hover: "#D15F4C",
    },
    ghost: {
      color: "#EA766E",
      hover: "#EA766E20",
    },
  },
} as {
  [K in ColorType]: {
    fill: ColorProps;
    ghost: ColorProps;
  };
};

export const sizes = {
  sm: {
    text: "text-sm",
    icon: "[&>svg]:text-[0.85em]",
    padding: "py-1 px-2",
    fat: "py-3 px-5",
  },
  md: {
    text: "text-sm",
    icon: "[&>svg]:text-[0.85em]",
    padding: "py-1 px-3",
    fat: "py-3 px-5",
  },
  lg: {
    text: "text-md",
    icon: "[&>svg]:text-[0.82em]",
    padding: "py-1.5 px-4",
    fat: "py-3 px-5",
  },
} as {
  [K in SizeType]: {
    text: string;
    padding: string;
    icon: string;
    fat: string;
  };
};

const applySize = (
  size: ButtonProps["size"] = "md",
  square?: boolean,
  circle?: boolean,
  fat?: boolean
) => {
  const sizeClasses = [];
  const { icon, text, padding, fat: fatPadding } = sizes[size];

  sizeClasses.push(text);

  if (square || circle) {
    sizeClasses.push("h-[3em] w-[3em]");

    if (circle) sizeClasses.push("!rounded-full");
  } else {
    if (fat) {
      sizeClasses.push(fatPadding);
      sizeClasses.push("!rounded-full");
    } else {
      sizeClasses.push(padding);
    }

    sizeClasses.push(icon);
  }

  return sizeClasses.join(" ");
};

const applyColor = (color: ColorType, fill?: boolean) => {
  const {
    color: chosenColor,
    background,
    border,
  } = colors[color][fill ? "fill" : "ghost"];

  const obj: any = {
    "--color-icon": chosenColor,
    "--icon-color": chosenColor,
    "--button-color": chosenColor,
    "--button-text-color": chosenColor,
    "--button-border-color": border || chosenColor,
  };

  if (background) {
    obj["--button-background-color"] = background;
  }

  return obj;
};

export const Button = (props: ButtonProps) => {
  const {
    className: classNameFromProps,
    rounded = true,
    circle,
    square,
    disabled,
    fat,
    fill,
    color = "default",
    size = "md",
    style,
    ...rest
  } = props;

  const classComponents = [
    css["button"],
    "inline-flex items-center justify-center",
    fill ? "" : "border border-solid",
    rounded ? "rounded-md" : "",
    applySize(size, square, circle, fat),
    disabled ? "opacity-50" : "",
  ];

  let className = classComponents.join(" ");

  if (classNameFromProps) className += ` ${classNameFromProps}`;

  const chosenColor = colors[color][fill ? "fill" : "ghost"];

  return (
    <motion.button
      className={className}
      whileHover={{
        backgroundColor: chosenColor.hover,
      }}
      style={{
        ...applyColor(color, fill),
        ...style,
      }}
      disabled={disabled}
      {...rest}
    >
      {props.children}
    </motion.button>
  );
};
