import { useState, useRef } from 'react';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export const useMapInteraction = () => {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchStartPoint, setTouchStartPoint] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Pan and zoom handlers for mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;

    setTransform((prev) => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.max(0.5, Math.min(3, transform.scale * delta));

    setTransform((prev) => ({ ...prev, scale: newScale }));
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStartTime(Date.now());
      setTouchStartPoint({ x: touch.clientX, y: touch.clientY });
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      setHasMoved(false);
      setIsPanning(false);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      setIsPanning(false);
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartPoint.x;
      const deltaY = touch.clientY - touchStartPoint.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 10 && !hasMoved) {
        setHasMoved(true);
        setIsPanning(true);
        e.preventDefault();
      }

      if (isPanning) {
        e.preventDefault();
        const panDeltaX = touch.clientX - lastPanPoint.x;
        const panDeltaY = touch.clientY - lastPanPoint.y;

        setTransform((prev) => ({
          ...prev,
          x: prev.x + panDeltaX,
          y: prev.y + panDeltaY,
        }));

        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      }
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / lastTouchDistance;
      const newScale = Math.max(0.5, Math.min(3, transform.scale * scaleChange));

      setTransform((prev) => ({ ...prev, scale: newScale }));
      setLastTouchDistance(currentDistance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;

    if (!hasMoved && touchDuration < 300) {
      // Let the tap event bubble through for click handling
    } else {
      e.preventDefault();
    }

    setIsPanning(false);
    setLastTouchDistance(null);
    setHasMoved(false);
  };

  const resetTransform = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const zoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2),
    }));
  };

  const zoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, prev.scale * 0.8),
    }));
  };

  return {
    transform,
    isPanning,
    hasMoved,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTransform,
    zoomIn,
    zoomOut,
  };
};
