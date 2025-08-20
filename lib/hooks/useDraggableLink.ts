import React from "react";

// export const useDraggableLink = () => {
//   const dragging = React.useRef(false);

//   return {
//     onMouseDown: () => {
//       dragging.current = false;
//     },
//     onMouseMove: () => {
//       dragging.current = true;
//     },
//     onClick: (e: React.SyntheticEvent) => {
//       e.stopPropagation();

//       if (dragging.current) {
//         e.preventDefault();

//         return false;
//       }

//       return true;
//     },
//     draggable: false,
//   };
// };

export const useDraggableLink = (thresholdPixels = 5) => {
  const mouseDownPosition = React.useRef({ x: 0, y: 0 });
  const dragging = React.useRef(false);

  const onMouseDown = (e: any) => {
    dragging.current = false;
    mouseDownPosition.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: any) => {
    const deltaX = Math.abs(e.clientX - mouseDownPosition.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPosition.current.y);

    if (deltaX > thresholdPixels || deltaY > thresholdPixels) {
      dragging.current = true;
    }
  };

  const onClickCapture = (e: any) => {
    if (dragging.current) {
      e.stopPropagation();
      e.preventDefault();

      return false;
    }

    return true;
  };

  return {
    onMouseDown,
    onMouseMove,
    onClickCapture,
    onClick: onClickCapture,
    draggable: false,
    dragging,
  };
};
