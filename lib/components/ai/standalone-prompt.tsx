import React from "react";
import SquareSparkles from "lib/assets/icons/square-sparkle.svg";
import { cn } from "lib/shadcn/lib/utils";

export const StandalonePrompt = (props: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={props.onClick}
      className={cn(
        "px-4 py-2 border rounded-xl rounded-bl-none bg-white border-solid border-[#E1E4EA] flex gap-2 text-xs flex justify center items-center flex-nowrap text-[#99A0AE] cursor-pointer",
        props.className
      )}
    >
      <SquareSparkles
        className="icon shrink-0"
        style={{ fill: "#7D52F4", fontSize: "18px" }}
      />
      {props.children}
    </div>
  );
};
