import { useRef } from "react";

// Reusable props for the SVG element, can be used with any SVG element
const useSVGProps = ({ onSVGElementClick }: any) => {
  const interactionStart = useRef<{ x: number; y: number } | null>(null);
  const movementExceededThreshold = useRef(false);

  const handleInteractionStart = (clientX: number, clientY: number) => {
    interactionStart.current = { x: clientX, y: clientY };
    movementExceededThreshold.current = false;
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    if (interactionStart.current && !movementExceededThreshold.current) {
      const deltaX = clientX - interactionStart.current.x;
      const deltaY = clientY - interactionStart.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 5) {
        movementExceededThreshold.current = true;
      }
    }
  };

  const handleInteractionEnd = () => {
    interactionStart.current = null;
    movementExceededThreshold.current = false;
  };

  const shouldPreventClick = () => {
    return movementExceededThreshold.current;
  };

  return { 
    width: '100%',
    height: '100%',
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      handleInteractionStart(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      handleInteractionMove(e.clientX, e.clientY);
    },
    onTouchStart: (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleInteractionStart(touch.clientX, touch.clientY);
      }
    },
    onTouchMove: (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleInteractionMove(touch.clientX, touch.clientY);
      }
    },
    onClick: (e: React.MouseEvent<SVGSVGElement>) => {
      if (shouldPreventClick()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const target = e.target as SVGElement;
      if (target.id && onSVGElementClick) {
        e.stopPropagation();
        onSVGElementClick(target.id, e);
      }

      handleInteractionEnd();
    },
    onTouchEnd: (e: React.TouchEvent<SVGSVGElement>) => {
      if (shouldPreventClick()) {
        e.preventDefault();
        e.stopPropagation();
        handleInteractionEnd();
        return;
      }
      const target = e.target as SVGElement;
      if (target.id && onSVGElementClick) {
        e.stopPropagation();
        onSVGElementClick(target.id, e);
      }
      handleInteractionEnd();
    }
  };
};

export default useSVGProps;