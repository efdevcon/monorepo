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
import MapTest from './maps/MapTest';
import {
  svgToLookup,
  svgToLookupWithGroups,
  SVGLookup,
  ElementPosition,
} from './utils/svgToLookup';
import { Pin } from './components/Pin';
import cn from 'classnames';
import css from './map.module.scss';
import { X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getViewportPosition } from './utils/svgToLookup';

const MapPane = (props: {
  selection: string | null;
  setCurrentFilters: (filters: typeof initialFilters) => void;
  elementLookup: SVGLookup;
}) => {
  const { selection, elementLookup } = props;

  const element = selection ? elementLookup[selection] : null;

  return (
    <div
      className={cn(
        'flex justify-between absolute z-[1] bottom-0 left-0 right-0 border-t border-t-solid border-gray-200 p-4 transition-all duration-300 translate-y-[100%] opacity-0',
        selection && '!translate-y-[0%] opacity-100',
        css['map']
      )}
      // Don't let the click/touch events bubble up to the panzoom container
      onClick={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
    >
      <div className={cn('text-sm font-bold', !selection && 'text-white')}>
        {element?.id || selection || 'no-selection'}
      </div>
      <div className="flex items-center justify-center">
        <X
          className="h-4 w-4"
          onClick={() => props.setCurrentFilters(initialFilters)}
          onTouchEnd={() => props.setCurrentFilters(initialFilters)}
        />
      </div>
    </div>
  );
};

const initialFilters = {
  search: '', // Search term, not supported yet but added for future use
  selection: [], // Array for flexibility in case we want to build more complex filter combinations
} as {
  search: string;
  selection: string[];
};

export const VenueMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [elementLookup, setElementLookup] = useState<SVGLookup>({});
  const [svgScale, setSvgScale] = useState({ scaleX: 1, scaleY: 1 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [elementData, setElementData] = useState<{ [key: string]: any }>({
    'art-exhibition': {
      groups: ['art'],
    },
    'entrance-1': {
      groups: ['art'],
    },
    'cowork-8': {
      groups: ['coworks'],
    },
    'cowork-1': {
      groups: ['coworks'],
    },
  });

  const [currentFilters, setCurrentFilters] =
    useState<typeof initialFilters>(initialFilters);

  useEffect(() => {
    const selection = searchParams.get('filter');
    if (selection) {
      setCurrentFilters({
        ...currentFilters,
        selection: [selection],
      });
    }
  }, [searchParams]);

  const allPossibleFilters = useMemo(() => {
    // Get from database / api
    const groups = ['art', 'coworks'];

    const elementKeys = Object.keys(elementLookup);

    return {
      groups: groups,
      elements: elementKeys,
    };
  }, [elementLookup]);

  // console.log(allPossibleFilters, 'allPossibleFilters');

  const selectedElements = useMemo(() => {
    const { groups, elements } = allPossibleFilters;

    // Selected filters
    // const selectedFilters = currentFilters.selection.map((key) => {
    //   // @ts-ignore
    //   return filters[key];
    // });

    return elements.filter((key) => {
      // const element = elementLookup[key];
      const element = elementData[key];
      const elementGroups = element?.groups;

      // @ts-ignore
      const isInGroup = elementGroups
        ? currentFilters.selection.some((activeGroup: string) =>
            elementGroups.some((g: string) => g === activeGroup)
          )
        : false;
      // @ts-ignore
      const isSelected = currentFilters.selection.includes(key);

      return isInGroup || isSelected;
    });
  }, [currentFilters, allPossibleFilters]);

  // console.log(selectedElements, 'selectedElements');

  const { panzoomInstance, interactionsLocked } = usePanzoom('venue-map');

  useEffect(() => {
    const elementsWithIds = svgRef.current?.querySelectorAll(
      '[id]:not(svg):not(g)'
    );

    const lookup: SVGLookup = {};

    elementsWithIds?.forEach((element: Element) => {
      const id = element.id;
      if (id) {
        lookup[id] = element as unknown as ElementPosition;
      }
    });

    setElementLookup(lookup);

    // Wait for next frame to ensure SVG is fully rendered
    // requestAnimationFrame(() => {
    //   const lookup = svgToLookup(svgRef.current);
    //   setElementLookup(lookup);
    //   // Also get grouped data
    //   // const { elements, groups } = svgToLookupWithGroups(svgRef.current);
    //   // setGroupData(groups);
    //   // Calculate scale between SVG viewBox and actual rendered size
    //   // if (svgRef.current) {
    //   //   const svgRect = svgRef.current.getBoundingClientRect();
    //   //   const viewBox = svgRef.current.viewBox.baseVal;
    //   //   const scaleX = svgRect.width / viewBox.width;
    //   //   const scaleY = svgRect.height / viewBox.height;
    //   //   setSvgScale({ scaleX, scaleY });
    //   // }
    // });

    requestAnimationFrame(() => {
      if (svgRef.current) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const viewBox = svgRef.current.viewBox.baseVal;
        const scaleX = svgRect.width / viewBox.width;
        const scaleY = svgRect.height / viewBox.height;
        setSvgScale({ scaleX, scaleY });
      }
    });
  }, []);

  const hasActiveFilters =
    currentFilters.selection.length > 0 || currentFilters.search.length > 0;

  // Apply hover effect to all SVG elements dynamically
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElements = svgRef.current.querySelectorAll('[id]:not(g)');

    svgElements.forEach((element) => {
      const isSelected = selectedElements.includes(element.id);
      const isHovered = hoveredElement === element.id;

      const svgElement = element as SVGElement;
      if (isSelected || isHovered) {
        svgElement.style.opacity = '1';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else if (hasActiveFilters) {
        svgElement.style.opacity = '0.15';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else {
        svgElement.style.opacity = '1';
      }
    });
  }, [selectedElements, hoveredElement, hasActiveFilters]);

  const handleSVGMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    if (
      target &&
      target.id &&
      target.tagName !== 'g' &&
      target.tagName !== 'svg'
    ) {
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
      target.tagName !== 'svg'
    ) {
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
    panzoomInstance.moveBy(deltaX, deltaY - 30, true);
  };

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    if (elementLookup[id] && !interactionsLocked) {
      // const isCurrentlySelected = selectedElement === id;
      // setSelectedElement(isCurrentlySelected ? null : id);

      setCurrentFilters({
        ...currentFilters,
        selection: [id],
      });

      // Focus on the element if it's being selected (not deselected)
      // if (!isCurrentlySelected) {
      focusOnElement(id);
      // }
    }
  };

  return (
    <div
      ref={containerRef}
      id="venue-container"
      className={cn(
        'relative w-full overflow-hidden grow flex py-8'
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
        <MapTest ref={svgRef} onSVGElementClick={onSVGElementClick} />

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
        selection={currentFilters.selection[0]}
        elementLookup={elementLookup}
        setCurrentFilters={setCurrentFilters}
      />

      {/* Filters */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        {allPossibleFilters.groups.map((group) => (
          <button
            key={group}
            className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              panzoomInstance?.moveTo(0, 0);
              panzoomInstance?.smoothZoomAbs(0, 0, 1);
              setCurrentFilters({ ...currentFilters, selection: [group] });
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              panzoomInstance?.moveTo(0, 0);
              panzoomInstance?.smoothZoomAbs(0, 0, 1);
              setCurrentFilters({ ...currentFilters, selection: [group] });
            }}
          >
            {group}
          </button>
        ))}
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
