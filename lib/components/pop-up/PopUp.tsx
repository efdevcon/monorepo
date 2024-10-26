import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "lib/components/button";

export const Popup = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const scrollPositionRef = React.useRef(0);
  const scrollLock = React.useRef(false);

  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    // Check if the device is iOS
    const checkIsIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    setIsIOS(checkIsIOS());
  }, []);

  //   React.useEffect(() => {
  //     if (open) {
  //       scrollPositionRef.current = window.scrollY;
  //       scrollLock.current = true;

  //       if (isIOS) {
  //         // IOS needs this demonic hack to work... (this effectively hides a visual bug while also disabling scroll on background)
  //         setTimeout(() => {
  //           if (!scrollLock.current) return;
  //           document.documentElement.style.overflow = "hidden";
  //           document.documentElement.style.height = "100vh";
  //           document.body.style.overflow = "hidden";
  //           document.body.style.height = "100vh";
  //         }, 300);
  //       } else {
  //         // For non-iOS devices, use a simpler approach
  //         document.body.style.overflow = "hidden";
  //       }
  //     } else {
  //       scrollLock.current = false;
  //       if (isIOS) {
  //         document.documentElement.style.overflow = "";
  //         document.documentElement.style.height = "";
  //         document.body.style.overflow = "";
  //         document.body.style.height = "";
  //       } else {
  //         document.body.style.overflow = "";
  //       }
  //       window.scrollTo(0, scrollPositionRef.current);
  //     }

  //     return () => {
  //       document.documentElement.style.overflow = "";
  //       document.documentElement.style.height = "";
  //       document.body.style.overflow = "";
  //       document.body.style.height = "";
  //     };
  //   }, [open, isIOS]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed flex items-end justify-center inset-0 z-[13] bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.3 },
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <motion.div
            data-type="popup"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{
              y: "100%",
              transition: { duration: 0.3, type: "tween", bounce: 0 },
            }}
            transition={{
              duration: 0.8,
              type: "spring",
              bounce: 0.35,
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 bg-white self-center rounded-2xl rounded-bl-none rounded-br-none mb-0  shadow flex"
          >
            <div className="absolute top-[-12px] left-0 translate-y-[-100%] w-full flex items-center justify-center mb-2 pointer-events-none">
              <Button
                onClick={() => setOpen(false)}
                fill
                size="sm"
                color="black-1"
                className="pointer-events-auto"
              >
                Back to Overview
              </Button>
            </div>
            <div className="max-w-[500px] min-w-[300px] w-screen  max-h-[80vh] overflow-auto px-4 p-4 pb-24 lg:pb-4 no-scrollbar">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
