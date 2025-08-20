import React, { useState, useRef, useEffect } from 'react'
import { X, Users, Utensils, Coffee, Cpu, Microscope, Palette, ShoppingBag, LogIn, DoorOpen, Briefcase, ArrowLeft, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { POI, pois } from '@/data/poiData';
import { filterCategories } from '@/data/filterCategories';
import { districtPositions } from '@/data/districtPositions';

interface EventMapProps {
  onFocusedModeChange?: (focused: boolean) => void;
  focusDistrict?: string | null;
}

const EventMap = ({ onFocusedModeChange, focusDistrict }: EventMapProps) => {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null
  );
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchStartPoint, setTouchStartPoint] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Get POI color based on category
  const getPOIColor = (category: string) => {
    const categoryInfo = filterCategories.find((f) => f.key === category);
    return categoryInfo ? categoryInfo.color : 'bg-gray-100 text-gray-700';
  };

  // Get SVG filter for highlighted categories
  const getCategoryFilter = (category: string) => {
    if (!activeFilters.has(category)) return 'none';

    const filterMap: Record<string, string> = {
      cowork: 'url(#cowork-glow)',
      defi: 'url(#defi-glow)',
      biotech: 'url(#biotech-glow)',
      hardware: 'url(#hardware-glow)',
      social: 'url(#social-glow)',
      coffee: 'url(#coffee-glow)',
      fnb: 'url(#fnb-glow)',
      toilets: 'url(#toilets-glow)',
      'art-exhbition': 'url(#art-glow)',
      swag: 'url(#swag-glow)',
      entrance: 'url(#entrance-glow)',
    };

    return filterMap[category] || 'none';
  };

  // Helper function to determine if a category should be dimmed
  const shouldDimCategory = (category: string) => {
    // If no filters are active, show everything at full opacity
    if (activeFilters.size === 0) return false;
    // If filters are active, dim categories that aren't selected
    return !activeFilters.has(category);
  };

  // Toggle filter
  const toggleFilter = (category: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(category)) {
      newFilters.delete(category);
    } else {
      newFilters.add(category);
    }
    setActiveFilters(newFilters);
  };

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
    // Reduce zoom sensitivity for better trackpad experience
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.max(0.5, Math.min(3, transform.scale * delta));

    setTransform((prev) => ({ ...prev, scale: newScale }));
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for potential pan or tap
      const touch = e.touches[0];
      setTouchStartTime(Date.now());
      setTouchStartPoint({ x: touch.clientX, y: touch.clientY });
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      setHasMoved(false);
      setIsPanning(false); // Don't start panning immediately
    } else if (e.touches.length === 2) {
      // Multi-touch - prepare for pinch zoom
      e.preventDefault(); // Only prevent default for multi-touch
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

      // If we've moved more than 10 pixels, consider it a pan gesture
      if (distance > 10 && !hasMoved) {
        setHasMoved(true);
        setIsPanning(true);
        e.preventDefault(); // Only prevent default once we start panning
      }

      if (isPanning) {
        e.preventDefault();
        // Single touch panning
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
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / lastTouchDistance;
      const newScale = Math.max(
        0.5,
        Math.min(3, transform.scale * scaleChange)
      );

      setTransform((prev) => ({ ...prev, scale: newScale }));
      setLastTouchDistance(currentDistance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;

    // If it was a short touch (< 300ms) and didn't move much, treat it as a tap
    if (!hasMoved && touchDuration < 300) {
      // Let the tap event bubble through for click handling
      // Don't prevent default to allow click events
    } else {
      // For pan gestures, prevent default
      e.preventDefault();
    }

    setIsPanning(false);
    setLastTouchDistance(null);
    setHasMoved(false);
  };

  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
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

    // Get the map container element
    const mapContainer = svgRef.current.parentElement?.parentElement;
    if (!mapContainer) return;

    // SVG viewBox dimensions
    const svgWidth = 614.01;
    const svgHeight = 771;
    const districtPos = districtPositions[districtId];
    if (districtPos) {
      const scale = 1.5;

      // Calculate how much to translate to center the district
      // The SVG is positioned at the center of the container by default
      const svgCenterX = svgWidth / 2;
      const svgCenterY = svgHeight / 2;

      // Calculate offset from SVG center to district center
      const offsetX = districtPos.svgX - svgCenterX;
      const offsetY = districtPos.svgY - svgCenterY;

      // Apply scale to the offset and invert to get translation
      const translateX = -offsetX * scale;
      const translateY = -offsetY * scale;

      setTransform({
        x: translateX,
        y: translateY,
        scale: scale,
      });

      // Don't auto-open modal - let users tap the district to learn more
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
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 614.01 771"
            className="w-full h-full"
            style={{ minWidth: '614px', minHeight: '771px' }}
          >
            {/* Filter definitions for category highlights */}
            <defs>
              <filter
                id="cowork-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="defi-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#3b82f6"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="biotech-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#9333ea"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="hardware-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#f97316"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="social-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#06b6d4"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="coffee-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#ef4444"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="fnb-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#ec4899"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="toilets-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#6b7280"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="art-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#eab308"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="swag-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#6366f1"
                  flood-opacity="0.4"
                />
              </filter>
              <filter
                id="entrance-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  flood-color="#14b8a6"
                  flood-opacity="0.4"
                />
              </filter>
            </defs>

            {/* Walls - always visible */}
            <g id="walls_" data-name="walls ">
              <path
                id="interior-wall-1"
                d="M109,769h502.63l-48.92-261.76,1.97-.37,49.33,264.13H107v-54H13v-2h94v-241h2v295ZM58,568h-2v-94h2v94ZM468,7l83.9,437.15-1.96.38L466.38,9h-138.38v-2h140ZM58,338h-2V63H0v-2h58v277ZM275,9H109v329h-2V9H14v-2h261v2Z"
              />
            </g>

            {/* Swag */}
            <g
              id="swag_"
              data-name="swag/"
              style={{
                opacity: shouldDimCategory('swag') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('swag'),
              }}
            >
              <rect
                id="swag"
                x="175"
                y="706"
                width="67"
                height="62"
                fill="#e0af7d"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('swag', e)}
                onTouchEnd={(e) => handleSVGElementClick('swag', e)}
              />
              {!shouldDimCategory('swag') &&
                renderIcon(ShoppingBag, 208.5, 737, 18)}
            </g>

            {/* Art Exhibition */}
            <g
              id="art-exhbition_"
              data-name="art-exhbition "
              style={{
                opacity: shouldDimCategory('art-exhbition') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('art-exhbition'),
              }}
            >
              <rect
                id="art-exhibit-1"
                x="376.65"
                y="22.12"
                width="94"
                height="99.37"
                transform="translate(-5.91 82.46) rotate(-11.04)"
                fill="#eddab6"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('art-exhibit-1', e)}
                onTouchEnd={(e) => handleSVGElementClick('art-exhibit-1', e)}
              />
              {!shouldDimCategory('art-exhbition') &&
                renderIcon(Palette, 424, 72, 20)}
            </g>

            {/* Toilets */}
            <g
              id="toilets_"
              data-name="toilets "
              style={{
                opacity: shouldDimCategory('toilets') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('toilets'),
              }}
            >
              <rect
                id="toilet-mf"
                x="556.7"
                y="294.77"
                width="22"
                height="22"
                transform="translate(-43.9 101.52) rotate(-9.84)"
                fill="blue"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('toilet-mf', e)}
                onTouchEnd={(e) => handleSVGElementClick('toilet-mf', e)}
              />
              {!shouldDimCategory('toilets') &&
                renderIcon(Users, 567.7, 305.77, 12)}

              <rect
                id="toilet-dis"
                x="561.7"
                y="319.77"
                width="22"
                height="22"
                transform="translate(-48.1 102.74) rotate(-9.84)"
                fill="blue"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('toilet-dis', e)}
                onTouchEnd={(e) => handleSVGElementClick('toilet-dis', e)}
              />
              {!shouldDimCategory('toilets') &&
                renderIcon(Users, 572.7, 330.77, 12)}
            </g>

            {/* Food & Beverage */}
            <g
              id="fnb_"
              data-name="fnb "
              style={{
                opacity: shouldDimCategory('fnb') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('fnb'),
              }}
            >
              <rect
                id="fnb-4"
                x="27"
                y="662"
                width="28"
                height="48"
                fill="#ff85a6"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('fnb-4', e)}
                onTouchEnd={(e) => handleSVGElementClick('fnb-4', e)}
              />
              {!shouldDimCategory('fnb') && renderIcon(Utensils, 41, 686, 16)}

              <rect
                id="fnb-3"
                x="27"
                y="569"
                width="28"
                height="88"
                fill="#ff85a6"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('fnb-3', e)}
                onTouchEnd={(e) => handleSVGElementClick('fnb-3', e)}
              />
              {!shouldDimCategory('fnb') && renderIcon(Utensils, 41, 613, 18)}

              <rect
                id="fnb-2"
                x="27"
                y="183"
                width="28"
                height="40"
                fill="#ff85a6"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('fnb-2', e)}
                onTouchEnd={(e) => handleSVGElementClick('fnb-2', e)}
              />
              {!shouldDimCategory('fnb') && renderIcon(Utensils, 41, 203, 14)}

              <rect
                id="fnb-1"
                x="20"
                y="70"
                width="34"
                height="40"
                fill="#ff85a6"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('fnb-1', e)}
                onTouchEnd={(e) => handleSVGElementClick('fnb-1', e)}
              />
              {!shouldDimCategory('fnb') && renderIcon(Utensils, 37, 90, 16)}
            </g>

            {/* DeFi */}
            <g
              id="defi"
              style={{
                opacity: shouldDimCategory('defi') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('defi'),
              }}
            >
              <rect
                id="defi-1"
                x="162.37"
                y="301.9"
                width="104.4"
                height="52.2"
                fill="#74acdf"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('defi-district', e)}
                onTouchEnd={(e) => handleSVGElementClick('defi-district', e)}
              />
              {!shouldDimCategory('defi') &&
                renderIcon(DollarSign, 214.57, 328, 18)}
            </g>

            {/* BioTech */}
            <g
              id="biotech_"
              data-name="biotech /"
              style={{
                opacity: shouldDimCategory('biotech') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('biotech'),
              }}
            >
              <rect
                id="biotech-1"
                x="162.37"
                y="193.4"
                width="104.4"
                height="52.2"
                fill="#74acdf"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('biotech-district', e)}
                onTouchEnd={(e) => handleSVGElementClick('biotech-district', e)}
              />
              {!shouldDimCategory('biotech') &&
                renderIcon(Microscope, 214.57, 219.5, 18)}
            </g>

            {/* Hardware */}
            <g
              id="hardware"
              style={{
                opacity: shouldDimCategory('hardware') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('hardware'),
              }}
            >
              <rect
                id="hardware-1"
                x="162.37"
                y="486"
                width="104.4"
                height="52.2"
                fill="#74acdf"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('hardware-district', e)}
                onTouchEnd={(e) =>
                  handleSVGElementClick('hardware-district', e)
                }
              />
              {!shouldDimCategory('hardware') &&
                renderIcon(Cpu, 214.57, 512.1, 18)}
            </g>

            {/* Coffee */}
            <g
              id="coffee"
              style={{
                opacity: shouldDimCategory('coffee') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('coffee'),
              }}
            >
              <rect
                id="coffee-3"
                x="328"
                y="236"
                width="27"
                height="27"
                fill="#f50b0b"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coffee-stations', e)}
                onTouchEnd={(e) => handleSVGElementClick('coffee-stations', e)}
              />
              {!shouldDimCategory('coffee') &&
                renderIcon(Coffee, 341.5, 249.5, 12)}

              <rect
                id="coffee-2"
                x="328"
                y="236"
                width="27"
                height="27"
                fill="#f50b0b"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coffee-stations', e)}
                onTouchEnd={(e) => handleSVGElementClick('coffee-stations', e)}
              />
              {!shouldDimCategory('coffee') &&
                renderIcon(Coffee, 341.5, 249.5, 12)}

              <rect
                id="coffee-1"
                x="328"
                y="459"
                width="27"
                height="27"
                fill="#f50b0b"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coffee-stations', e)}
                onTouchEnd={(e) => handleSVGElementClick('coffee-stations', e)}
              />
              {!shouldDimCategory('coffee') &&
                renderIcon(Coffee, 341.5, 472.5, 12)}
            </g>

            {/* Coworking */}
            <g
              id="cowork"
              style={{
                opacity: shouldDimCategory('cowork') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('cowork'),
              }}
            >
              <rect
                id="cowork-8"
                x="146"
                y="104"
                width="100"
                height="34"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 196, 121, 16)}

              <rect
                id="cowork-7"
                x="328"
                y="206"
                width="27"
                height="27"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 341.5, 219.5, 12)}

              <rect
                id="cowork-6"
                x="321"
                y="266"
                width="41"
                height="42"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 341.5, 287, 14)}

              <rect
                id="cowork-5"
                x="321"
                y="328"
                width="41"
                height="42"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 341.5, 349, 14)}

              <rect
                id="cowork-4"
                x="328"
                y="429"
                width="28"
                height="27"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 342, 442.5, 12)}

              <rect
                id="cowork-3"
                x="328"
                y="520"
                width="28"
                height="27"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 342, 533.5, 12)}

              <rect
                id="cowork-2"
                x="410.65"
                y="457.07"
                width="100.63"
                height="33.17"
                transform="translate(-82.04 96.85) rotate(-11.02)"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 461, 473.6, 16)}

              <rect
                id="cowork-1"
                x="468"
                y="653"
                width="102"
                height="34"
                fill="#aaeba1"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('coworking-area', e)}
                onTouchEnd={(e) => handleSVGElementClick('coworking-area', e)}
              />
              {!shouldDimCategory('cowork') &&
                renderIcon(Briefcase, 519, 670, 16)}
            </g>

            {/* Entrances */}
            <g
              id="entrance_"
              data-name="entrance "
              style={{
                opacity: shouldDimCategory('entrance') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('entrance'),
              }}
            >
              <rect
                id="entrance-east"
                x="555.81"
                y="441.76"
                width="34.18"
                height="62.65"
                transform="translate(-80.55 119.49) rotate(-11.13)"
                fill="#e5ec10"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('entrance-east', e)}
                onTouchEnd={(e) => handleSVGElementClick('entrance-east', e)}
              />
              {!shouldDimCategory('entrance') &&
                renderIcon(DoorOpen, 573, 473, 14)}

              <rect
                id="entrance-north"
                x="275"
                y="0"
                width="53"
                height="17"
                fill="#e5ec10"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('entrance-north', e)}
                onTouchEnd={(e) => handleSVGElementClick('entrance-north', e)}
              />
              {!shouldDimCategory('entrance') &&
                renderIcon(DoorOpen, 301.5, 8.5, 12)}

              <rect
                id="entrance-west"
                x="56"
                y="338"
                width="53"
                height="136"
                fill="#e5ec10"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('entrance-west', e)}
                onTouchEnd={(e) => handleSVGElementClick('entrance-west', e)}
              />
              {!shouldDimCategory('entrance') &&
                renderIcon(DoorOpen, 82.5, 406, 18)}
            </g>

            {/* Social District - New */}
            <g
              id="social"
              style={{
                opacity: shouldDimCategory('social') ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
                filter: getCategoryFilter('social'),
              }}
            >
              <rect
                id="social-1"
                x="162.37"
                y="600.77"
                width="104.4"
                height="52.2"
                fill="#74acdf"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleSVGElementClick('social-district', e)}
                onTouchEnd={(e) => handleSVGElementClick('social-district', e)}
              />
              {!shouldDimCategory('social') &&
                renderIcon(Users, 214.57, 626.87, 18)}
            </g>
          </svg>
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setTransform((prev) => ({
                ...prev,
                scale: Math.min(3, prev.scale * 1.2),
              }))
            }
            className="bg-white shadow-md"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setTransform((prev) => ({
                ...prev,
                scale: Math.max(0.5, prev.scale * 0.8),
              }))
            }
            className="bg-white shadow-md"
          >
            −
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="bg-white shadow-md"
          >
            ⌂
          </Button>
        </div>
      </div>

      {/* POI Detail Modal */}
      {selectedPOI && (
        <div
          className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4"
          onClick={closePOIModal}
        >
          <div
            className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hero Image */}
            {selectedPOI.heroImage && (
              <div className="relative">
                <img
                  src={selectedPOI.heroImage}
                  alt={selectedPOI.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.style.display = 'none';
                    }
                  }}
                />
                <button
                  onClick={closePOIModal}
                  className="absolute top-3 right-3 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Modal Header */}
            <div
              className={`flex items-center justify-between p-4 ${selectedPOI.heroImage ? '' : 'border-b'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${getPOIColor(selectedPOI.category)}`}
                >
                  {filterCategories.find((f) => f.key === selectedPOI.category)
                    ?.icon &&
                    React.createElement(
                      filterCategories.find(
                        (f) => f.key === selectedPOI.category
                      )!.icon,
                      { className: 'h-5 w-5' }
                    )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedPOI.name}
                  </h2>
                  <p className="text-sm text-gray-600 capitalize">
                    {selectedPOI.category}
                  </p>
                </div>
              </div>
              {!selectedPOI.heroImage && (
                <button
                  onClick={closePOIModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Company Description */}
              {selectedPOI.companyDescription && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">About</h4>
                  <p className="text-sm text-gray-700">
                    {selectedPOI.companyDescription}
                  </p>
                </div>
              )}

              {/* Companies List for Districts */}
              {selectedPOI.companies && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Companies Showcasing
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {selectedPOI.companies.map((company, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {company}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Event */}
              {selectedPOI.currentEvent && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">
                    Current Event
                  </h4>
                  <p className="text-sm text-blue-700">
                    {selectedPOI.currentEvent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventMap
