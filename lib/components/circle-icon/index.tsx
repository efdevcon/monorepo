import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "lib/components/ui/popover";
import cn from "classnames";
import css from "./icon.module.scss";

export const CircleIcon = (props: any) => {
  const [open, setOpen] = React.useState(false);

  const handleMouseEnter = () => {
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  const body = (
    <div
      onClick={props.onClick}
      className={cn(
        "cursor-pointer rounded-full bg-white h-[20px] w-[20px] flex items-center justify-center border border-solid border-[#E1E4EA] hover:border-neutral-400 transition-colors duration-500",
        css["circle-icon"],
        "animate-border",
        props.className
      )}
    >
      {props.children}
    </div>
  );

  if (!props.popoverContent) {
    return body;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="plain no-outline"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {body}
      </PopoverTrigger>
      <PopoverContent>
        <div className="text-sm">{props.popoverContent}</div>
      </PopoverContent>
    </Popover>
  );
};
