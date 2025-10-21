import { cn } from "lib/shadcn/lib/utils";
import Link from "next/link";

const Button = ({ color, fill, disabled, fat, ...props }: any) => {
  const computedColor = (() => {
    const defaultColor =
      "border-[#125181] bg-[#1B6FAE] text-white hover:bg-[rgba(60,138,197,1)] disabled:opacity-70 disabled:pointer-events-none";
    // TODO: add more colors
    if (color === "blue-1") return defaultColor;
    if (color === "blue-2")
      return "bg-[rgba(0,115,222)] border-[#125181] text-white hover:bg-[rgba(60,138,197,1)] disabled:opacity-70 disabled:pointer-events-none";
    if (color === "green-1")
      return "border-[#0D5424] bg-[#127331] text-white hover:bg-[#127331] disabled:opacity-70 disabled:pointer-events-none";
    if (color === "red-1")
      return "border-[#991b1b] bg-[#dc2626] text-white hover:bg-[rgba(239,68,68,1)]";
    if (color === "white-1")
      return "border-gray-300 bg-white text-black hover:bg-gray-50";
    if (color === "white-2")
      return "bg-[rgba(234,243,250)] text-black border-[rgba(89,89,120,1)]";
    if (color === "purple-1")
      return "border-[rgba(106,43,159)] bg-[rgb(120,52,208)] text-white hover:bg-[rgba(136,85,204,0.8)] disabled:opacity-70 disabled:pointer-events-none";

    return defaultColor;
  })();

  // TODO: implement sizes
  const size = (() => {
    if (fat) return "px-4 py-2";
    if (props.size === "sm") return "px-4 py-1 text-sm border-b-[4px]";

    return "px-8 py-2";
  })();

  return (
    <button
      {...props}
      className={cn(
        computedColor,
        "cursor-pointer border-solid border-b-[6px] group px-8 py-2 text-lg transition-colors hover:!border-transparent flex items-center justify-center disabled:pointer-events-none disabled:opacity-70",
        size,
        props.className
      )}
      disabled={disabled}
    >
      <div className="group-hover:!translate-y-[3px] pt-0.5 transition-transform flex items-center justify-center gap-2">
        {props.children}
      </div>
    </button>
  );
};

// Used to render TinaCMS buttons
export const CMSButtons = (data: any) => {
  if (!data.Button) return <></>;

  return (
    <div className="flex gap-4" data-cms-element="button">
      {data.Button.map(({ text, url, color, disabled, fill }: any) => {
        if (!url || !text) return null;

        return (
          <Link href={url} key={text}>
            <Button
              fat
              color={color || "purple-1"}
              fill={typeof fill === "undefined" ? true : fill}
              disabled={disabled}
            >
              {text}
            </Button>
          </Link>
        );
      })}
    </div>
  );
};

export default Button;
