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
import { useSearchParams, useRouter } from 'next/navigation';
import { getViewportPosition } from './utils/svgToLookup';

const MapPane = (props: {
  selection: string | null;
  setCurrentFilters: (filters: typeof initialFilters) => void;
  elementLookup: SVGLookup;
}) => {
  const { selection, elementLookup } = props;
  const router = useRouter();

  const element = selection ? elementLookup[selection] : null;

  // Hardcoded data for now
  const elementData = {
    title: element?.id || selection || 'no-selection',
    description:
      'Explore the AI-powered IDE that lets you write code using instructions.',
    hasQuest: true,
    image: '/images/icons/star.png', // Placeholder image
  };

  return (
    <div
      className={cn(
        'absolute z-[1] bottom-0 left-0 right-0 transition-all duration-300 translate-y-[100%] opacity-0',
        selection && '!translate-y-[0%] opacity-100',
        css['map']
      )}
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.70)',
        background:
          'linear-gradient(0deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.70) 100%), linear-gradient(0deg, #AAA7FF 0%, #F6B40E 100%)',
        boxShadow: '0 -2px 4px 0 rgba(54, 54, 76, 0.10)',
      }}
      // Don't let the click/touch events bubble up to the panzoom container
      onClick={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="flex flex-col gap-4 p-5 pt-5">
        {/* Header with back button and close button */}
        <div className="flex justify-between items-center">
          {/* Back button - hardcoded navigation to /quests/app-showcase#14 */}
          <button
            onClick={(e) => {
              console.log('Back button clicked');
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/quests/app-showcase#14';
            }}
            onTouchEnd={(e) => {
              console.log('Back button touched');
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/quests/app-showcase#14';
            }}
            className="flex gap-1 items-center hover:opacity-80 transition-opacity"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="#36364c"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-sm font-semibold text-[#36364c]">Back</div>
          </button>

          {/* Close button - navigates to /map and closes MapPane */}
          <button
            onClick={(e) => {
              console.log('Close button clicked');
              e.preventDefault();
              e.stopPropagation();
              props.setCurrentFilters(initialFilters);
              window.location.href = '/map';
            }}
            onTouchEnd={(e) => {
              console.log('Close button touched');
              e.preventDefault();
              e.stopPropagation();
              props.setCurrentFilters(initialFilters);
              window.location.href = '/map';
            }}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <X className="w-4 h-4 text-[#36364c]" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex gap-3 items-start">
          {/* Image */}
          <div className="w-11 h-11 bg-gray-200 rounded flex-shrink-0">
            <img
              src={elementData.image}
              alt={elementData.title}
              className="w-full h-full object-cover rounded"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {/* Title and AI badge */}
            <div className="flex gap-1.5 items-center">
              <div className="text-base font-bold text-[#242436]">
                {elementData.title}
              </div>
              <div className="px-1 py-0.5 border border-[#4b4b66] rounded">
                <div className="text-[10px] font-semibold text-[#36364c] tracking-[0.2px]">
                  AI
                </div>
              </div>
            </div>

            {/* Quest info */}
            {elementData.hasQuest && (
              <div className="flex gap-1 items-center">
                <div className="w-4 h-4 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 1L10.09 5.26L15 6L11 9.74L11.82 15L8 12.27L4.18 15L5 9.74L1 6L5.91 5.26L8 1Z"
                      fill="#36364c"
                    />
                  </svg>
                </div>
                <div className="text-xs font-medium text-[#36364c] tracking-[-0.1px]">
                  Quest available
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="text-sm text-[#36364c] tracking-[-0.1px] leading-[1.3]">
          {elementData.description}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="flex-1 bg-[#eaf3fa] border border-white rounded px-3 py-3 shadow-[0px_4px_0px_0px_#595978] hover:bg-[#ddeaf5] transition-colors"
          >
            <div className="text-sm font-bold text-[#36364c] text-center">
              Learn more
            </div>
          </button>
          {/* View Quest button - hardcoded navigation to /quests/app-showcase#14 */}
          <button
            onClick={(e) => {
              console.log('View Quest button clicked');
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/quests/app-showcase#14';
            }}
            onTouchEnd={(e) => {
              console.log('View Quest button touched');
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/quests/app-showcase#14';
            }}
            className="flex-1 bg-[#1b6fae] rounded px-3 py-3 shadow-[0px_4px_0px_0px_#125181] hover:bg-[#155a8a] transition-colors"
          >
            <div className="text-sm font-bold text-white text-center">
              View Quest
            </div>
          </button>
        </div>
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
        'relative w-full overflow-hidden grow flex'
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
