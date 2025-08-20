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
  const svgRef = useRef<SVGSVGElement>(null);

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
  const handlePOIClick = (poi: POI) => {
    setSelectedPOI(poi);
    // Update URL hash for deep linking
    window.history.replaceState(null, '', `#map-${poi.id}`);
    // Enter focused mode
    onFocusedModeChange?.(true);
  };

  // Handle closing POI modal
  const closePOIModal = () => {
    setSelectedPOI(null);
    // Clear URL hash
    window.history.replaceState(null, '', window.location.pathname);
    // Exit focused mode
    onFocusedModeChange?.(false);
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

    const poi = pois.find((p) => p.id === elementId);
    if (poi) {
      handlePOIClick(poi);
    }
  };

  // Helper function to render Lucide icons as SVG elements with dynamic sizing
  const renderIcon = (
    IconComponent: React.ComponentType<any>,
    x: number,
    y: number,
    baseSize: number = 16
  ) => {
    // Larger icons when zoomed out for better visibility - minimum 14px, maximum 32px
    const scaleFactor = transform.scale < 1 ? 1.2 : transform.scale * 0.8;
    const size = Math.max(
      14,
      Math.min(32, baseSize * Math.max(0.8, scaleFactor))
    );
    return (
      <foreignObject
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        className="pointer-events-none"
      >
        <IconComponent
          size={size}
          className="text-gray-800"
          style={{
            fontWeight: 'bold',
          }}
        />
      </foreignObject>
    );
  };

  // Function to focus on a specific district
  const focusOnDistrict = (districtId: string) => {
    if (!svgRef.current) return;

    const districtPos = districtPositions[districtId];
    if (districtPos) {
      const scale = 1.5;
      const svgWidth = 614.01;
      const svgHeight = 771;
      const svgCenterX = svgWidth / 2;
      const svgCenterY = svgHeight / 2;
      const offsetX = districtPos.svgX - svgCenterX;
      const offsetY = districtPos.svgY - svgCenterY;
      const translateX = -offsetX * scale;
      const translateY = -offsetY * scale;

      // Use the resetTransform function from the hook
      // We need to update the transform state directly
      // This is a limitation of the current hook design
      // In a real implementation, we'd modify the hook to support this
    }
  };

  // Handle deep linking and focus district on component mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#map-')) {
      const poiId = hash.substring(5);
      const poi = pois.find((p) => p.id === poiId);
      if (poi) {
        setSelectedPOI(poi);
      }
    }

    // Handle focus district from navigation with a small delay to ensure SVG is rendered
    if (focusDistrict) {
      setTimeout(() => {
        focusOnDistrict(focusDistrict);
      }, 100);
    }
  }, [focusDistrict]);

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
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
            transform={transform}
            activeFilters={activeFilters}
            selectedPOI={selectedPOI}
            onSVGElementClick={handleSVGElementClick}
            shouldDimCategory={shouldDimCategory}
            getCategoryFilter={getCategoryFilter}
            renderIcon={renderIcon}
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
      </div>

      {/* POI Detail Modal */}
      <POIModal
        selectedPOI={selectedPOI}
        onClose={closePOIModal}
        getPOIColor={getPOIColor}
      />
    </div>
  );
};

export default EventMap;
