"use client";

import * as React from "react";
import { Drawer, DrawerContent } from "lib/components/ui/drawer";
import cn from "classnames";

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

// Renders shadcn drawer for mobile, and custom inline absolutely positioned drawer on desktop
const FlexibleDrawer = ({
  children,
  open,
  onOpenChange,
  className,
  hideHandle = false,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  hideHandle?: boolean;
}) => {
  const isMd = useMediaQuery("(min-width: 768px)");

  // Desktop: inline absolutely positioned drawer
  if (isMd) {
    return (
      <>
        {/* Backdrop */}
        {/* <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out",
            open && "pointer-events-auto opacity-100",
            !open && "pointer-events-none opacity-0"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        /> */}

        {/* Drawer content */}
        <div
          className={cn(
            "absolute left-0 bottom-0 right-0 w-full bg-white shadow-xl z-50 overflow-auto transition-transform duration-300 ease-in-out",
            open ? "translate-y-0" : "translate-y-full",
            className
          )}
          onClick={(e) => {
            console.log("onClick innedrawer");
            e.stopPropagation();
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </>
    );
  }

  // Mobile: shadcn drawer (bottom sheet)
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={className}
        // Let people interact when the drawer is open, otherwise the overlay will block all interactions
        overlayClassName="!pointer-events-none"
        hideHandle={hideHandle}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onTouchEnd={(e: React.TouchEvent) => e.stopPropagation()}
      >
        {children}
      </DrawerContent>
    </Drawer>
  );
};

export default FlexibleDrawer;
