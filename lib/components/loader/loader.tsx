import React from "react";
import css from "./loader.module.scss";
import cn from "classnames";

const Loader = (props: any) => {
  const spinner = <div className={cn(css["spinner"], props.className)}></div>;

  if (props.children) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div>{spinner}</div>
        <div>{props.children}</div>
      </div>
    );
  }

  return spinner;
};

export default Loader;
