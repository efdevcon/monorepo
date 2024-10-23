import React from "react";

export const useDraggableLink = () => {
  const dragging = React.useRef(false);

  return {
    onMouseDown: () => {
      dragging.current = false;
    },
    onMouseMove: () => {
      dragging.current = true;
    },
    onClick: (e: React.SyntheticEvent) => {
      e.stopPropagation();

      if (dragging.current) {
        e.preventDefault();

        return false;
      }

      return true;
    },
    draggable: false,
  };
};
