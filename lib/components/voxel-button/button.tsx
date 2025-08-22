import { cn } from "lib/shadcn/lib/utils";
import Link from "next/link";

const Button = ({ color, fill, disabled, fat, ...props }: any) => {
  const computedColor = (() => {
    const defaultColor =
      "border-[#125181] bg-[#1B6FAE] text-white hover:bg-[rgba(60,138,197,1)] disabled:opacity-70 disabled:pointer-events-none";
    // TODO: add more colors
    if (color === "blue-1") return defaultColor;
    if (color === "green-1")
      return "border-[#195a20] bg-[#16a34a] text-white hover:bg-[rgba(34,197,94,1)]";
    if (color === "red-1")
      return "border-[#991b1b] bg-[#dc2626] text-white hover:bg-[rgba(239,68,68,1)]";
    if (color === "white-1")
      return "border-gray-300 bg-white text-black hover:bg-gray-50";

    return defaultColor;
  })();

  // TODO: implement sizes
  const size = (() => {
    if (fat) return "px-4 py-2";
    if (props.size === "sm") return "px-4 py-1 text-sm";

    return "px-8 py-2";
  })();

  return (
    <button
      {...props}
      className={cn(
        computedColor,
        "border-solid border-b-[6px] group px-8 py-2 text-lg transition-colors hover:border-opacity-0 flex items-center justify-center",
        size,
        props.className
      )}
      disabled={disabled}
    >
      <div className="group-hover:translate-y-[3px] pt-0.5 transition-transform flex items-center justify-center gap-2">
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
