'use client';
// https://github.com/timmywil/panzoom
import React, { useRef, useEffect, useState } from 'react';
import { usePanzoom, PanzoomControls } from './panzoom';
import MapWrapper from './maps/MapWrapper';
import cn from 'classnames';
import css from './map.module.scss';
import { useSearchParams, useRouter } from 'next/navigation';
// import { getViewportPosition } from './utils/svgToLookup';
import MapPane from './components/panes';
import { SurfaceFilters, ListFilters } from './components/filters';
import { HomeIcon } from 'lucide-react';
import { poisData } from '@/data/pois';
import { districtsData } from '@/data/districts';
import { poiGroupsData } from '@/data/poiGroups';
import { supportersData } from '@/data/supporters';
import Image from 'next/image';
import backgroundImage from './bg-image-new.png';

const initialFilters = {
  search: '', // Search term, not supported yet but added for future use
  selection: null, // Array for flexibility in case we want to build more complex filter combinations
} as {
  search: string;
  selection: string | null;
};

const baseZoomLevel = 4.1;

export const VenueMap = () => {
  // const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const [elementLookup, setElementLookup] = useState<SVGLookup>({});
  // const [svgScale, setSvgScale] = useState({ scaleX: 1, scaleY: 1 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [listFiltersOpen, setListFiltersOpen] = useState(false);
  const initialZoomLevel = useRef<number | null>(null);
  // const [elementData, setElementData] = useState<{ [key: string]: any }>({
  //   'art-exhibition': {
  //     groups: ['art'],
  //   },
  //   'entrance-1': {
  //     groups: ['art'],
  //   },
  //   'cowork-8': {
  //     groups: ['coworks'],
  //   },
  //   'cowork-1': {
  //     groups: ['coworks'],
  //   },
  // });
  const [zoomLevel, setZoomLevel] = useState<'zoomed-in' | 'zoomed-out'>(
    'zoomed-out'
  );

  const [currentFilters, setCurrentFilters] =
    useState<typeof initialFilters>(initialFilters);

  const selection = searchParams.get('filter');

  const { panzoomInstance, interactionsLocked } = usePanzoom(
    'venue-map',
    setZoomLevel,
    zoomLevel,
    selection ? baseZoomLevel : undefined
  );

  const reset = () => {
    setCurrentFilters(initialFilters);
    setListFiltersOpen(false);
  };

  useEffect(() => {
    const selection = searchParams.get('filter');

    if (selection && panzoomInstance) {
      setListFiltersOpen(false);

      setCurrentFilters({
        ...currentFilters,
        selection: selection,
      });

      setTimeout(() => {
        // focusOnElement(selection);
        moveToElement(selection, false);
      }, 50);

      // focusOnElement(selection);

      // router.replace(`/map`);
    }
  }, [searchParams, panzoomInstance]);

  const hasActiveFilters =
    currentFilters.selection !== null || currentFilters.search.length > 0;

  /*
    Each click should resolve up until it finds an element with notion data available
    When no notion data available, return null
  */
  const resolveClickable = (id: string): string | null => {
    // Check if element exists in POI data
    const poiData = poisData.find((poi) => poi.layerName === id);
    if (poiData) return id;

    // Check if element exists in supporter data
    const supporterData = Object.values(supportersData).find(
      (supporter) => supporter.layerName === id
    );
    if (supporterData) return id;

    // Check if element exists in district data
    const districtData = Object.values(districtsData).find(
      (district: any) => district.layerName === id
    );
    if (districtData) return id;

    // Check if element exists in POI group data
    const groupData = Object.values(poiGroupsData).find(
      (group: any) => group.layerName === id
    );
    if (groupData) return id;

    // No notion data available for this element
    return null;
  };

  // Apply hover effect to all SVG elements dynamically
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElements = svgRef.current.querySelectorAll('[id]:not(g)');

    svgElements.forEach((element) => {
      const isSelected = currentFilters.selection === element.id;
      const isHovered = false; // hoveredElement === element.id;

      const svgElement = element as SVGElement;
      if (isSelected || isHovered) {
        // svgElement.style.opacity = '1';
        // svgElement.style.filter = 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 1))';
        // svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else if (hasActiveFilters) {
        // Selected fallback
        // svgElement.style.opacity = '0.15';
        // svgElement.style.transition = 'opacity 0.5s ease-in-out';
        svgElement.style.filter = 'none';
      } /*else if (hoveredElement) {
        // Hover fallback
        svgElement.style.opacity = '0.5';
        svgElement.style.filter = 'none';
      } */ else {
        // Reset fallback
        if (svgElement.style.opacity) {
          svgElement.style.opacity = '';
        }
        if (svgElement.style.filter) {
          svgElement.style.filter = '';
        }
      }
    });
  }, [currentFilters.selection, hoveredElement, hasActiveFilters]);

  const handleSVGMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;

    if (
      target &&
      target.id &&
      target.tagName !== 'g' &&
      target.tagName !== 'svg' &&
      target.id !== 'venue-map'
    ) {
      // target.classList.add('highlight-active');
      // target.classList.add(css['highlighted']);

      if (hoveredElement !== target.id) {
        setHoveredElement(target.id);
      }
    }
  };

  const handleSVGMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    if (
      target &&
      target.id &&
      target.tagName !== 'g' &&
      target.tagName !== 'svg' &&
      target.id !== 'venue-map'
    ) {
      // target.classList.remove(css['highlighted']);
      setHoveredElement(null);
    }
  };

  const zoomToElement = (id: string) => {
    const svgElement = document.getElementById(id);
    if (!svgElement || !panzoomInstance || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const targetCenterX = containerRect.left + containerRect.width / 2;
    const targetCenterY = containerRect.top + containerRect.height / 2;

    const { scale: currentZoom } = panzoomInstance.getTransform();

    panzoomInstance.zoomAbs(
      targetCenterX,
      targetCenterY,
      Math.max(currentZoom, baseZoomLevel)
    );
  };

  const moveToElement = (id: string, smooth: boolean = true) => {
    const svgElement = document.getElementById(id);
    if (!svgElement || !panzoomInstance || !containerRef.current) return;
    const elementRect = svgElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const elementCenterX = elementRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top + elementRect.height / 2;
    const targetCenterX = containerRect.left + containerRect.width / 2;
    const targetCenterY = containerRect.top + containerRect.height / 2;

    const deltaX = targetCenterX - elementCenterX;
    const deltaY = targetCenterY - elementCenterY;

    if (smooth) {
      panzoomInstance.moveBy(deltaX, deltaY - 50, true);
    } else {
      panzoomInstance.moveBy(deltaX, deltaY - 50, false);
    }
  };

  const focusOnElement = (id: string, offset: number = 50) => {
    const svgElement = document.getElementById(id);

    if (!svgElement || !panzoomInstance || !containerRef.current) return;

    const currentTransform = panzoomInstance.getTransform();
    const targetZoom = Math.max(currentTransform.scale, baseZoomLevel);

    // Get element and container rectangles
    const elementRect = svgElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Element center in container-relative coordinates
    const elementScreenX =
      elementRect.left + elementRect.width / 2 - containerRect.left;
    const elementScreenY =
      elementRect.top + elementRect.height / 2 - containerRect.top;

    // Target position in container-relative coordinates (center of container)
    const targetScreenX = containerRect.width / 2;
    const targetScreenY = containerRect.height / 2 - offset;

    // Calculate element's position in SVG coordinate space (unaffected by transform)
    // Using: svgPos = (screenPos - transform.offset) / scale
    const elementSvgX =
      (elementScreenX - currentTransform.x) / currentTransform.scale;
    const elementSvgY =
      (elementScreenY - currentTransform.y) / currentTransform.scale;

    // Calculate what the transform offset should be to position this SVG point at target
    // Using: screenPos = svgPos * scale + transform.offset
    // Rearranging: transform.offset = screenPos - svgPos * scale
    const targetTransformX = targetScreenX - elementSvgX * targetZoom;
    const targetTransformY = targetScreenY - elementSvgY * targetZoom;

    // Calculate the focal point that produces the desired transform when zooming
    // From panzoom source: transform.x = focalX - ratio * (focalX - transform.x)
    // We want: targetTransformX = focalX - ratio * (focalX - currentTransform.x)
    // Solving: focalX = (targetTransformX - ratio * currentTransform.x) / (1 - ratio)
    const ratio = targetZoom / currentTransform.scale;

    // Handle edge case where there's no zoom change (ratio = 1)
    if (Math.abs(ratio - 1) < 0.001) {
      const deltaX = targetTransformX - currentTransform.x;
      const deltaY = targetTransformY - currentTransform.y;

      // Validate deltas before moving
      if (!isFinite(deltaX) || !isFinite(deltaY)) {
        console.error('Invalid pan deltas:', {
          deltaX,
          deltaY,
          targetTransformX,
          targetTransformY,
          currentTransform,
        });
        return;
      }

      panzoomInstance.moveBy(deltaX, deltaY, true);
    } else {
      const focalX =
        (targetTransformX - ratio * currentTransform.x) / (1 - ratio);
      const focalY =
        (targetTransformY - ratio * currentTransform.y) / (1 - ratio);

      // Validate focal points and zoom values before calling smoothZoomAbs
      if (
        !isFinite(focalX) ||
        !isFinite(focalY) ||
        !isFinite(targetZoom) ||
        targetZoom <= 0
      ) {
        console.error('Invalid zoom parameters:', {
          focalX,
          focalY,
          targetZoom,
          ratio,
          currentTransform,
          targetTransformX,
          targetTransformY,
          elementSvgX,
          elementSvgY,
        });
        return;
      }

      panzoomInstance.smoothZoomAbs(focalX, focalY, targetZoom);
    }
  };

  console.log(currentFilters.selection, 'currentFilters.selection');

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    // if (elementLookup[id] && !interactionsLocked) {
    // const isCurrentlySelected = selectedElement === id;
    // setSelectedElement(isCurrentlySelected ? null : id);

    // console.log(id, 'id');

    // Bubble up DOM tree until we find an element with notion data
    let currentElement = event.target as SVGElement | null;
    let resolvedId: string | null = null;

    while (currentElement && currentElement.tagName !== 'svg') {
      let id = currentElement.id;
      if (id === 'onboarding_2') id = 'onboarding';
      if (id === 'registration-1') id = 'registration';
      if (id === 'media-area') id = 'media';
      if (id === 'food-truck-1') id = 'food-truck';

      console.log(id, 'currentElement.id');
      if (id) {
        const clicked = resolveClickable(id);
        if (clicked) {
          resolvedId = clicked;
          break;
        }
      }
      currentElement = currentElement.parentElement as SVGElement | null;
    }

    if (!resolvedId) {
      const pavillions = [
        'building-green-pavilion',
        'building-the-cave',
        'building-the-hub-amphitheater',
        'building-main-arena',
        'building-quiet-cowork',
        'building-red-pavilion',
        'building-blue-pavilion',
        'building-music-stage',
        'building-yellow-pavillion',
        'building-entertainment',
      ];

      // Check if clicked element or any parent is a pavilion
      let checkElement = event.target as SVGElement | null;
      while (checkElement && checkElement.tagName !== 'svg') {
        if (checkElement.id && pavillions.includes(checkElement.id)) {
          console.log('focusing on pavilion', checkElement.id);
          focusOnElement(checkElement.id, 0);
          return;
        }
        checkElement = checkElement.parentElement as SVGElement | null;
      }
    }

    const currentZoom = panzoomInstance?.getTransform().scale;

    // Prevent selection if zoom level changed (user was zooming, not clicking)
    if (
      initialZoomLevel.current !== null &&
      currentZoom !== initialZoomLevel.current
    ) {
      initialZoomLevel.current = null;
      return;
    }

    initialZoomLevel.current = null;

    setListFiltersOpen(false);

    if (currentFilters.selection && !resolvedId) {
      //  } && resolvedId !== currentFilters.selection) {
      setCurrentFilters({
        ...currentFilters,
        selection: null,
      });
    } else {
      setCurrentFilters({
        ...currentFilters,
        selection: resolvedId,
      });

      console.log('setting selection', resolvedId);

      if (resolvedId) {
        focusOnElement(resolvedId);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id="venue-container"
      className={cn(
        'relative w-full overflow-hidden grow flex py-16 px-4 md:h-[80vh]',
        // 'gradient-background',
        css.map,
        zoomLevel === 'zoomed-in' && css['zoomed-in'],
        zoomLevel === 'zoomed-out' && css['zoomed-out'],
        hoveredElement && css['highlight-active']
        // hasActiveFilters && css['has-selection-or-hover']
      )}
      onClick={(e) => {
        e.stopPropagation();
        reset();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        reset();
      }}
    >
      <Image
        src={backgroundImage}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
        quality={100}
      />
      {/* Panzoom container */}
      <div
        id="venue-map"
        className="relative w-full"
        onMouseOver={handleSVGMouseOver}
        onMouseOut={handleSVGMouseOut}
      >
        <MapWrapper
          ref={svgRef}
          onSVGElementClick={onSVGElementClick}
          onInteractionStart={() => {
            if (panzoomInstance) {
              initialZoomLevel.current = panzoomInstance.getTransform().scale;
            }
          }}
        />

        {/* Pin layer overlay - moves with the panzoom */}
        {/* <div
          className="absolute top-0 left-0 overflow-visible"
          style={{ pointerEvents: 'none' }}
        >
          {hoveredElement && elementLookup[hoveredElement] && (
            <Pin
              key={hoveredElement}
              x={elementLookup[hoveredElement].centerX * svgScale.scaleX}
              y={elementLookup[hoveredElement].centerY * svgScale.scaleY}
              label={hoveredElement}
              color="#FF0000"
              size={16}
            />
          )}
        </div> */}
      </div>

      <MapPane
        selection={currentFilters.selection}
        setSelection={(selection) =>
          setCurrentFilters({
            ...currentFilters,
            selection: selection as string | null,
          })
        }
      />
      {/* Filters */}
      {/* <div className="absolute top-4 left-4 flex flex-col gap-2 z-10"> */}
      {/* {allPossibleFilters.groups.map((group) => (
          <button
            key={group}
            className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              panzoomInstance?.moveTo(0, 0);
              panzoomInstance?.smoothZoomAbs(0, 0, 1);
              setCurrentFilters({ ...currentFilters, selection: group });
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              panzoomInstance?.moveTo(0, 0);
              panzoomInstance?.smoothZoomAbs(0, 0, 1);
              setCurrentFilters({ ...currentFilters, selection: group });
            }}
          >
            {group}
          </button>
        ))} */}
      {/* </div> */}

      {/* Zoom controls */}
      <div
        className="absolute bottom-3 right-3 shadow-xs flex flex-col gap-2 z-10"
        onTouchStartCapture={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {/* <button
          className="basic-button white-button small-button"
          onMouseDown={(e) => e.stopPropagation()}
          data-prevent-interaction-element={true}
          onClick={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              panzoomInstance.smoothZoom(0, 0, 1.1);
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              panzoomInstance.smoothZoom(0, 0, 1.1);
            }
          }}
        >
          +
        </button>
        <button
          className="basic-button white-button small-button"
          onMouseDown={(e) => e.stopPropagation()}
          data-prevent-interaction-element={true}
          onClick={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              reset();

              panzoomInstance.pause();

              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);

              panzoomInstance.resume();
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              reset();
              panzoomInstance.pause();
              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);
              panzoomInstance.resume();
            }
          }}
        >
          -
        </button> */}
        <button
          className="basic-button white-button small-button !px-2"
          data-prevent-interaction-element={true}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              reset();

              panzoomInstance.pause();

              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);

              panzoomInstance.resume();
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              reset();

              panzoomInstance.pause();

              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);

              panzoomInstance.resume();
            }
          }}
        >
          <HomeIcon className="w-4 h-4 !text-[rgba(0,115,222,1)]" />
        </button>
      </div>

      <div
        className={cn(
          'absolute bottom-2 flex justify-center text-white items-center text-center left-0 opacity-80 w-full z-[10] text-[11px] font-bold transition-opacity duration-300',
          zoomLevel === 'zoomed-in' && '!opacity-0 pointer-events-none'
        )}
      >
        Zoom in for details
      </div>

      <SurfaceFilters
        selection={currentFilters.selection}
        setSelection={(selection) => {
          setCurrentFilters({
            ...currentFilters,
            selection: selection,
          });
          if (selection) {
            focusOnElement(selection);
          }
        }}
      />
      <ListFilters
        open={listFiltersOpen}
        setOpen={setListFiltersOpen}
        selection={currentFilters.selection}
        setSelection={(selection) => {
          setCurrentFilters({
            ...currentFilters,
            selection: selection,
          });
          if (selection) {
            focusOnElement(selection);
          }
        }}
      />
    </div>
  );
};

/*
  1) Select multiple svg elements (via filter selection, e.g. "toilet" should map to all toilets) + highlight them
  2) Resolve information by id (e.g. "toilet-1" should show information about the toilet (if there is any))
  3) Deep linking - e.g. /map&filter=toilet-1
  4) Search - e.g. /map?search="toilet"


  
    1) Zoom into element programatically by id (so we can use it via search params / url deep link)
    2) Place pin on elements
    3) Highlight elements
    4) Get current zoom level
    5) Show different parts of the map depending on the zoom level (low to high fidelity)
*/

/*
  1) All data should be fetched and ready
  
  2) On click, set id DONE
    2.1) Pane should receive the current selection DONE
    2.2) Pane should have different views depending on the selection
      2.2.0) Shared building blocks - ID, share link, close button, background
      2.2.1) Fallback - just show ID, share link, close button, etc.
      2.2.2) Building - show everything in the building
      2.2.3) Stage - programming + link to stage
      2.2.4) ???? etc etc etc

  3) Map pane needs to block less of the view
    3.1) Zoom should be offset from the pane instead of absolute center

  4) Links point to pois DONE

  5) UI
    5.1) List
    5.2) Shortcut
    5.3) Zoom controls


  6) UX
    if panning or zooming, prevent clicks / selections
    zooming sometimes goes haywire and pans somewhere crazy 
*/

/*

  

*/
