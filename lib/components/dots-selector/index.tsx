import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

type DotsSelectorProps = {
  items: {
    label: string;
    onClick: () => void;
  }[];
  initialActiveIndex?: number;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
};

export const DotsSelector = ({
  items,
  initialActiveIndex = 0,
  activeIndex: controlledActiveIndex,
  onActiveIndexChange,
}: DotsSelectorProps) => {
  const [internalActiveIndex, setInternalActiveIndex] =
    useState(initialActiveIndex);
  const activeIndex =
    controlledActiveIndex !== undefined
      ? controlledActiveIndex
      : internalActiveIndex;
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleClick = (index: number) => {
    if (controlledActiveIndex === undefined) {
      setInternalActiveIndex(index);
    }
    onActiveIndexChange?.(index);
    items[index].onClick();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const newIndex = (activeIndex + direction + items.length) % items.length;
      handleClick(newIndex);
      buttonsRef.current[newIndex]?.focus();
    }
  };

  useEffect(() => {
    buttonsRef.current[activeIndex]?.focus();
  }, [activeIndex]);

  return (
    <div
      className="flex gap-1 items-center"
      role="tablist"
      aria-label="Notification steps"
    >
      {items.map((item, index) => (
        <a
          key={index}
          // @ts-ignore
          ref={(el) => (buttonsRef.current[index] = el)}
          className="h-2 flex-grow outline-none"
          onClick={() => handleClick(index)}
          onKeyDown={handleKeyDown}
          aria-label={item.label}
          aria-selected={index === activeIndex}
          role="tab"
          tabIndex={index === activeIndex ? 0 : -1}
        >
          <motion.div
            className={`h-[5px] cursor-pointer ${
              index === activeIndex ? "bg-[rgba(27,111,174,1)]" : "bg-gray-400"
            }`}
            animate={{
              width: index === activeIndex ? "100px" : "30px",
              // borderRadius: index === activeIndex ? "8px" : "4px",
            }}
            transition={{ duration: 0.3 }}
          />
        </a>
      ))}
    </div>
  );
};
