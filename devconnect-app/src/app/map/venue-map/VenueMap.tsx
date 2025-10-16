'use client';
// https://github.com/timmywil/panzoom
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { usePanzoom, PanzoomControls } from './panzoom';
import MapWrapper from './maps/MapWrapper';
import {
  svgToLookup,
  svgToLookupWithGroups,
  SVGLookup,
  ElementPosition,
} from './utils/svgToLookup';
import { Pin } from './components/Pin';
import { SupporterInfo } from './components/SupporterInfo';
import cn from 'classnames';
import css from './map.module.scss';
import { X } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getViewportPosition } from './utils/svgToLookup';
import FlexibleDrawer from 'lib/components/flexible-drawer';
import MapPane from './components/panes';

const initialFilters = {
  search: '', // Search term, not supported yet but added for future use
  selection: null, // Array for flexibility in case we want to build more complex filter combinations
} as {
  search: string;
  selection: string | null;
};

export const VenueMap = () => {
  // const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const [elementLookup, setElementLookup] = useState<SVGLookup>({});
  // const [svgScale, setSvgScale] = useState({ scaleX: 1, scaleY: 1 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const searchParams = useSearchParams();
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

  const { panzoomInstance, interactionsLocked } = usePanzoom(
    'venue-map',
    setZoomLevel,
    zoomLevel
  );

  useEffect(() => {
    const selection = searchParams.get('filter');

    if (selection && panzoomInstance) {
      setCurrentFilters({
        ...currentFilters,
        selection: selection,
      });

      focusOnElement(selection);

      // router.replace(`/map`);
    }
  }, [searchParams, panzoomInstance]);

  // const allPossibleFilters = useMemo(() => {
  //   // Get from database / api
  //   const groups = ['art', 'coworks'];

  //   const elementKeys = Object.keys(elementLookup);

  //   return {
  //     groups: groups,
  //     elements: elementKeys,
  //   };
  // }, [elementLookup]);

  // console.log(allPossibleFilters, 'allPossibleFilters');

  // const selectedElement = useMemo(() => {
  //   const { groups, elements } = allPossibleFilters;

  //   // Selected filters
  //   // const selectedFilters = currentFilters.selection.map((key) => {
  //   //   // @ts-ignore
  //   //   return filters[key];
  //   // });

  //   return elements.find((key) => {
  //     // const element = elementLookup[key];
  //     const element = elementData[key];
  //     // const elementGroups = element?.groups;

  //     // @ts-ignore
  //     // const isInGroup = elementGroups
  //     //   ? currentFilters.selection.some((activeGroup: string) =>
  //     //       elementGroups.some((g: string) => g === activeGroup)
  //     //     )
  //     //   : false;
  //     // @ts-ignore
  //     const isSelected = currentFilters.selection === key;

  //     return isSelected; // isInGroup || isSelected;
  //   });
  // }, [currentFilters, allPossibleFilters]);

  // console.log(selectedElement, 'selectedElements');

  // console.log(selectedElements, 'selectedElements');

  // useEffect(() => {
  //   const elementsWithIds = svgRef.current?.querySelectorAll(
  //     '[id]:not(svg):not(g)'
  //   );

  //   const lookup: SVGLookup = {};

  //   elementsWithIds?.forEach((element: Element) => {
  //     const id = element.id;
  //     if (id) {
  //       lookup[id] = element as unknown as ElementPosition;
  //     }
  //   });

  //   setElementLookup(lookup);

  //   // Wait for next frame to ensure SVG is fully rendered
  //   // requestAnimationFrame(() => {
  //   //   const lookup = svgToLookup(svgRef.current);
  //   //   setElementLookup(lookup);
  //   //   // Also get grouped data
  //   //   // const { elements, groups } = svgToLookupWithGroups(svgRef.current);
  //   //   // setGroupData(groups);
  //   //   // Calculate scale between SVG viewBox and actual rendered size
  //   //   // if (svgRef.current) {
  //   //   //   const svgRect = svgRef.current.getBoundingClientRect();
  //   //   //   const viewBox = svgRef.current.viewBox.baseVal;
  //   //   //   const scaleX = svgRect.width / viewBox.width;
  //   //   //   const scaleY = svgRect.height / viewBox.height;
  //   //   //   setSvgScale({ scaleX, scaleY });
  //   //   // }
  //   // });

  //   // requestAnimationFrame(() => {
  //   //   if (svgRef.current) {
  //   //     const svgRect = svgRef.current.getBoundingClientRect();
  //   //     const viewBox = svgRef.current.viewBox.baseVal;
  //   //     const scaleX = svgRect.width / viewBox.width;
  //   //     const scaleY = svgRect.height / viewBox.height;
  //   //     setSvgScale({ scaleX, scaleY });
  //   //   }
  //   // });
  // }, []);

  const hasActiveFilters =
    currentFilters.selection !== null || currentFilters.search.length > 0;

  // Apply hover effect to all SVG elements dynamically
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElements = svgRef.current.querySelectorAll('[id]:not(g)');

    svgElements.forEach((element) => {
      const isSelected = currentFilters.selection === element.id;
      const isHovered = hoveredElement === element.id;

      const svgElement = element as SVGElement;
      if (isSelected || isHovered) {
        svgElement.style.opacity = '1';
        svgElement.style.filter = 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 1))';

        // svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else if (hasActiveFilters) {
        // Selected fallback
        svgElement.style.opacity = '0.15';
        // svgElement.style.transition = 'opacity 0.5s ease-in-out';
        svgElement.style.filter = 'none';
      } /*else if (hoveredElement) {
        // Hover fallback
        svgElement.style.opacity = '0.5';
        svgElement.style.filter = 'none';
      } */ else {
        // Reset fallback
        svgElement.style.opacity = '1';
        svgElement.style.filter = 'none';
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

  const focusOnElement = (id: string) => {
    const svgElement = document.getElementById(id);

    if (!svgElement || !panzoomInstance || !containerRef.current) return;

    // Get actual screen positions - no scaling needed!
    const elementRect = svgElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Where is the element center on screen right now?
    const elementCenterX = elementRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top + elementRect.height / 2;

    // Where do we want it? (center of container)
    const targetCenterX = containerRect.left + containerRect.width / 2;
    const targetCenterY = containerRect.top + containerRect.height / 2;

    // How far to move?
    const deltaX = targetCenterX - elementCenterX;
    const deltaY = targetCenterY - elementCenterY;

    // Move it! (third parameter for smooth animation)
    // Offset Y slightly to account for the map pane that appears
    panzoomInstance.moveBy(deltaX, deltaY - 50, true);

    const { scale: currentZoom } = panzoomInstance.getTransform();

    // Zoom around the center of the container
    panzoomInstance.smoothZoomAbs(
      containerRect.width / 2,
      containerRect.height / 2,
      // Only adjust zoom level if its less than 3 (this is to avoid zooming out from where the user is already, but helps for zooming in when linking to a specific element)
      Math.max(currentZoom, 3)
    );
  };

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    // if (elementLookup[id] && !interactionsLocked) {
    // const isCurrentlySelected = selectedElement === id;
    // setSelectedElement(isCurrentlySelected ? null : id);

    // console.log(id, 'id');

    setCurrentFilters({
      ...currentFilters,
      selection: id,
    });

    focusOnElement(id);
  };

  return (
    <div
      ref={containerRef}
      id="venue-container"
      className={cn(
        'relative w-full overflow-hidden grow flex py-8 md:h-[80vh]',
        'gradient-background',
        css.map,
        zoomLevel === 'zoomed-in' && css['zoomed-in'],
        zoomLevel === 'zoomed-out' && css['zoomed-out'],
        hoveredElement && css['highlight-active']

        // hasActiveFilters && css['has-selection-or-hover']
      )}
      onClick={(e) => {
        e.stopPropagation();
        setCurrentFilters(initialFilters);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        setCurrentFilters(initialFilters);
      }}
    >
      {/* Panzoom container */}
      <div
        id="venue-map"
        className="relative w-full"
        onMouseOver={handleSVGMouseOver}
        onMouseOut={handleSVGMouseOut}
      >
        <MapWrapper ref={svgRef} onSVGElementClick={onSVGElementClick} />

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
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
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
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              setCurrentFilters(initialFilters);

              panzoomInstance.pause();

              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);

              panzoomInstance.resume();
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              setCurrentFilters(initialFilters);
              panzoomInstance.pause();
              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);
              panzoomInstance.resume();
            }
          }}
        >
          Reset View
        </button>
      </div>
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

*/

/*

  

*/
