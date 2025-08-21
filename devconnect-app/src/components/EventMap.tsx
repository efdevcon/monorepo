import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { POI, pois } from '@/data/poiData';
import { filterCategories } from '@/data/filterCategories';
import { districtPositions } from '@/data/districtPositions';
import { EventMapSVG } from './EventMapSVG';
import { POIModal } from './POIModal';
import { useMapInteraction } from '@/hooks/useMapInteraction';
import { useMapFilters } from '@/hooks/useMapFilters';

interface EventMapProps {
  onFocusedModeChange?: (focused: boolean) => void;
  focusDistrict?: string | null;
}

const EventMap = ({ onFocusedModeChange, focusDistrict }: EventMapProps) => {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [poiPosition, setPoiPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
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
  } = useMapInteraction();

  const {
    activeFilters,
    getPOIColor,
    getCategoryFilter,
    shouldDimCategory,
    toggleFilter,
  } = useMapFilters();

  // Handle POI click
  const handlePOIClick = (
    poi: POI,
    event?: React.MouseEvent | React.TouchEvent
  ) => {
    setSelectedPOI(poi);

    // Calculate position from SVG element center relative to map container
    const svgElement = document.getElementById(poi.id);
    if (svgElement && svgRef.current) {
      const mapContainer = svgRef.current.closest('.relative') as HTMLElement;
      const svgRect = svgElement.getBoundingClientRect();

      if (mapContainer) {
        const containerRect = mapContainer.getBoundingClientRect();

        // Calculate center of the SVG element relative to map container
        const x = svgRect.left + svgRect.width / 2 - containerRect.left;
        const y = svgRect.top + svgRect.height / 2 - containerRect.top;

        console.log('POI position calculated:', {
          poiId: poi.id,
          svgRect: {
            left: svgRect.left,
            top: svgRect.top,
            width: svgRect.width,
            height: svgRect.height,
          },
          containerRect: { left: containerRect.left, top: containerRect.top },
          center: { x, y },
        });

        setPoiPosition({ x, y });
      }
    }

    // Update URL hash for deep linking - use the POI ID directly
    const newHash = `#${poi.id}`;
    window.history.replaceState(null, '', newHash);
    // Enter focused mode
    onFocusedModeChange?.(true);
  };

  // Handle closing POI modal
  const closePOIModal = () => {
    // Clear the selected POI state to hide the tooltip first
    setSelectedPOI(null);
    setPoiPosition(null);
    // Exit focused mode
    onFocusedModeChange?.(false);
    // Clear URL hash after state is cleared to prevent race conditions
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Function to focus on a district and update URL
  const focusOnDistrictWithDeepLink = (districtId: string) => {
    if (districtPositions[districtId]) {
      // Set the district as active filter
      toggleFilter(districtId);
      // Update URL hash for deep linking - use the district ID directly
      const newHash = `#${districtId}`;
      window.history.replaceState(null, '', newHash);
      // Focus on the district
      setTimeout(() => {
        focusOnDistrict(districtId);
      }, 100);
    }
  };

  // Handle map container click to close tooltip
  const handleMapContainerClick = (e: React.MouseEvent) => {
    // Check if the clicked element is a POI or part of the tooltip
    const target = e.target as HTMLElement;
    const isPOI = pois.some((poi) => target.id === poi.id);
    const isTooltip = target.closest('[data-tooltip]') !== null;

    // Close tooltip if clicking anywhere that's not a POI or tooltip
    if (!isPOI && !isTooltip) {
      closePOIModal();
    }
  };

  // Handle SVG element click/tap
  const handleSVGElementClick = (
    elementId: string,
    e?: React.MouseEvent | React.TouchEvent
  ) => {
    // For touch events, only handle if it wasn't a pan gesture
    if (e && 'touches' in e) {
      if (hasMoved || isPanning) {
        return; // Don't handle tap if we were panning
      }
    }

    // Only handle clicks on actual POI elements
    const poi = pois.find((p) => p.id === elementId);
    if (poi) {
      handlePOIClick(poi, e);
      // Stop propagation to prevent map container click
      if (e) {
        e.stopPropagation();
      }
    }
  };

  // Function to focus on a specific district
  const focusOnDistrict = (districtId: string) => {
    const districtPos = districtPositions[districtId];
    if (!districtPos) return;

    // Calculate the center of the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;

    // Calculate the target position in the SVG
    const svgWidth = 1200; // Updated to match the new SVG dimensions
    const svgHeight = 800;
    const targetX = districtPos.svgX;
    const targetY = districtPos.svgY;

    // Calculate the transform to center the district
    const scale = 2; // Zoom in to the district
    const translateX = viewportCenterX - targetX * scale;
    const translateY = viewportCenterY - targetY * scale;

    // Apply the transform using the hook's functions
    // For now, we'll use a simple approach - reset and then apply the new transform
    resetTransform();

    // Note: The current hook doesn't support direct transform setting
    // In a production app, you'd want to extend the hook to support this
    console.log(
      `Focusing on district: ${districtId} at position (${targetX}, ${targetY})`
    );
  };

  // Recalculate POI position when transform changes
  useEffect(() => {
    if (selectedPOI && poiPosition) {
      const svgElement = document.getElementById(selectedPOI.id);
      if (svgElement && svgRef.current) {
        const mapContainer = svgRef.current.closest('.relative') as HTMLElement;
        const svgRect = svgElement.getBoundingClientRect();

        if (mapContainer) {
          const containerRect = mapContainer.getBoundingClientRect();

          // Calculate center of the SVG element relative to map container
          const x = svgRect.left + svgRect.width / 2 - containerRect.left;
          const y = svgRect.top + svgRect.height / 2 - containerRect.top;

          // Only update if position has actually changed significantly
          const positionChanged =
            Math.abs(x - poiPosition.x) > 5 || Math.abs(y - poiPosition.y) > 5;

          if (positionChanged) {
            // console.log('POI position recalculated after transform:', {
            //   poiId: selectedPOI.id,
            //   center: { x, y },
            // });

            setPoiPosition({ x, y });
          }
        }
      }
    }
  }, [transform, selectedPOI]);

  // Handle escape key to close POI modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedPOI) {
        closePOIModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPOI]);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e as any);
    };

    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [handleWheel]);

  // Handle deep linking and focus district on component mount
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      // Handle deep linking - if ID contains '-' it's a POI, otherwise it's a district
      if (hash.startsWith('#')) {
        const id = hash.substring(1); // Remove the # symbol

        if (id.includes('-')) {
          // It's a POI (contains hyphen)
          const poi = pois.find((p) => p.id === id);
          if (poi && selectedPOI?.id !== poi.id) {
            setSelectedPOI(poi);

            // Calculate position for tooltip (same logic as handlePOIClick)
            setTimeout(() => {
              const svgElement = document.getElementById(poi.id);
              if (svgElement && svgRef.current) {
                const mapContainer = svgRef.current.closest(
                  '.relative'
                ) as HTMLElement;
                const svgRect = svgElement.getBoundingClientRect();

                if (mapContainer) {
                  const containerRect = mapContainer.getBoundingClientRect();

                  // Calculate center of the SVG element relative to map container
                  const x =
                    svgRect.left + svgRect.width / 2 - containerRect.left;
                  const y =
                    svgRect.top + svgRect.height / 2 - containerRect.top;

                  console.log('Deep link POI position calculated:', {
                    poiId: poi.id,
                    center: { x, y },
                  });

                  setPoiPosition({ x, y });
                }
              }
            }, 100); // Small delay to ensure SVG is rendered

            // Enter focused mode for POI
            onFocusedModeChange?.(true);
          }
        } else {
          // It's a district (no hyphen)
          if (districtPositions[id]) {
            // Set the district as active filter
            toggleFilter(id);
            // Focus on the district after a small delay to ensure SVG is rendered
            setTimeout(() => {
              focusOnDistrict(id);
            }, 100);
          }
        }
      }

      // Clear selection if no hash (but only if we're not already clearing)
      if (!hash && selectedPOI !== null) {
        setSelectedPOI(null);
        setPoiPosition(null);
        onFocusedModeChange?.(false);
      }
    };

    // Handle initial load
    handleHashChange();

    // Handle focus district from navigation prop
    if (focusDistrict && !window.location.hash.startsWith('#')) {
      setTimeout(() => {
        focusOnDistrict(focusDistrict);
      }, 100);
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [focusDistrict, onFocusedModeChange, toggleFilter, selectedPOI]);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-white/90 text-sm">La Rural - Buenos Aires</p>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {filterCategories.map((category) => {
              const isActive = activeFilters.has(category.key);
              const Icon = category.icon;
              return (
                <button
                  key={category.key}
                  onClick={() => toggleFilter(category.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-white to-slate-100 cursor-move touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={mapContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleMapContainerClick}
        style={{ touchAction: 'none' }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          <EventMapSVG
            svgRef={svgRef}
            activeFilters={activeFilters}
            selectedPOI={selectedPOI}
            onSVGElementClick={handleSVGElementClick}
          />
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            className="bg-white shadow-md"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            className="bg-white shadow-md"
          >
            −
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetTransform}
            className="bg-white shadow-md"
          >
            ⌂
          </Button>
        </div>

        {/* POI Detail Modal */}
        <POIModal
          selectedPOI={selectedPOI}
          onClose={closePOIModal}
          getPOIColor={getPOIColor}
          position={poiPosition || undefined}
        />
      </div>
    </div>
  );
};

export default EventMap;
