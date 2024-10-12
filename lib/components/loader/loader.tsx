import React, { useState, useEffect } from "react";
import css from "./loader.module.scss";
import cn from "classnames";
import AppIcons from "lib/assets/icons/app-icons.svg";

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

const sequence = [
  [1, 2, 3],
  [2, 1, 3],
  [2, 3, 1],
  [3, 1, 2],
  // [2, 3, 1],
  // [3, 1, 2],
  // [1, 2, 3],
  // [2, 1, 3],
  // [2, 3, 1],
];

const Icons = ({
  dontAnimate = false,
  loading = false,
  size = 100,
}: {
  dontAnimate?: boolean;
  loading?: boolean;
  size?: number;
}) => {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldShow(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldShow || dontAnimate || !loading) return;

    const interval = setInterval(() => {
      setSequenceIndex((prevIndex) => (prevIndex + 1) % sequence.length);
    }, 400);

    return () => clearInterval(interval);
  }, [shouldShow, dontAnimate, loading]);

  const iconClass = (index: number) =>
    cn(
      "absolute transition-all duration-[150] px-0.5 flex items-center justify-center scale-[0.85]",
      {
        "translate-x-[100%]": sequence[sequenceIndex][index] === 1,
        "-translate-x-[0px]": sequence[sequenceIndex][index] === 2,
        "-translate-x-[100%]": sequence[sequenceIndex][index] === 3,
      },
      {
        "opacity-0 !duration-1000": !shouldShow || !loading,
        "opacity-100": shouldShow && loading,
      }
    );

  return (
    <div
      className="flex items-center justify-center relative"
      style={{ width: `${size}px`, height: `${size * 0.27}px` }}
    >
      <div className={iconClass(0)}>
        <svg
          width={size * 0.25}
          height={size * 0.23}
          viewBox="0 0 25 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.5459 1.48045C11.7501 0.288094 13.4626 0.28809 13.6669 1.48045L15.5373 12.3992C15.5806 12.6521 15.7128 12.8812 15.9102 13.0452L24.4309 20.1244C25.3614 20.8974 24.5052 22.3805 23.3705 21.9612L12.9793 18.1216C12.7386 18.0327 12.4741 18.0327 12.2335 18.1216L1.8423 21.9612C0.70756 22.3805 -0.148676 20.8974 0.781812 20.1244L9.30256 13.0452C9.4999 12.8812 9.63216 12.6521 9.67548 12.3992L11.5459 1.48045Z"
            fill="#000000"
          />
        </svg>
      </div>
      <div className={iconClass(1)}>
        <svg
          width={size * 0.26}
          height={size * 0.27}
          viewBox="0 0 26 27"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.7876 1.46474C11.9855 0.263322 13.713 0.263327 13.9109 1.46475L15.3106 9.96233C15.3856 10.4174 15.7422 10.7741 16.1974 10.8491L24.6949 12.2488C25.8964 12.4467 25.8963 14.1741 24.6949 14.372L16.1973 15.7717C15.7422 15.8467 15.3856 16.2034 15.3106 16.6585L13.9109 25.1561C13.713 26.3575 11.9855 26.3575 11.7876 25.156L10.388 16.6585C10.313 16.2034 9.956 15.8467 9.5012 15.7717L1.00362 14.372C-0.197799 14.1741 -0.197794 12.4467 1.00363 12.2488L9.5012 10.8491C9.95631 10.7741 10.313 10.4174 10.388 9.96232L11.7876 1.46474Z"
            fill="#000000"
          />
        </svg>
      </div>
      <div className={iconClass(2)}>
        <svg
          width={size * 0.24}
          height={size * 0.23}
          viewBox="0 0 24 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.7258 0.275617C11.9236 0.193716 12.1457 0.193716 12.3434 0.275617L19.6191 3.2893C19.8169 3.3712 19.9739 3.5283 20.0558 3.72602L23.0695 11.0017C23.1514 11.1994 23.1514 11.4216 23.0695 11.6193L20.0558 18.895C19.9739 19.0927 19.8169 19.2498 19.6191 19.3317L12.3434 22.3454C12.1457 22.4273 11.9236 22.4273 11.7258 22.3454L4.45014 19.3317C4.25242 19.2498 4.09533 19.0927 4.01343 18.895L0.999738 11.6193C0.917837 11.4216 0.917837 11.1994 0.999738 11.0017L4.01343 3.72602C4.09533 3.5283 4.25242 3.3712 4.45014 3.2893L11.7258 0.275617Z"
            fill="#000000"
          />
        </svg>
      </div>
    </div>
  );
};

// Primarily used by app
export const FancyLoader = ({
  dontAnimate = false,
  loading = false,
  className,
  size = 100,
}: {
  dontAnimate?: boolean;
  loading?: boolean;
  className?: string;
  size?: number;
}) => {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Icons dontAnimate={dontAnimate} loading={loading} size={size} />
    </div>
  );
};

export default Loader;
