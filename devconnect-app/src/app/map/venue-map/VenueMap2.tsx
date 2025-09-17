'use client';
// https://github.com/timmywil/panzoom
import React, { useRef, useEffect, useState } from 'react';
import { usePanzoom, PanzoomControls } from './panzoom';
import MapTest from './maps/MapTest';
import {
  svgToLookup,
  svgToLookupWithGroups,
  SVGLookup,
} from './utils/svgToLookup';
import { Pin } from './components/Pin';
import cn from 'classnames';
import css from './map.module.scss';
import { X } from 'lucide-react';

/*
    1) Zoom into element programatically by id (so we can use it via search params / url deep link)
    2) Place pin on elements
    3) Highlight elements
    4) Get current zoom level
    5) Show different parts of the map depending on the zoom level (low to high fidelity)
*/

const MapPane = (props: {
  selection: string | null;
  setSelectedElement: (element: string | null) => void;
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
      onClick={(e) => {
        e.stopPropagation();
        // setSelectedElement(null);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        // setSelectedElement(null);
      }}
    >
      <div className={cn('text-sm font-bold', !selection && 'text-white')}>
        {element?.id || 'no-selection'}
      </div>
      <div className="flex items-center justify-center">
        <X
          className="h-4 w-4"
          onClick={() => props.setSelectedElement(null)}
          onTouchEnd={() => props.setSelectedElement(null)}
        />
      </div>
    </div>
  );
};

export const VenueMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [elementLookup, setElementLookup] = useState<SVGLookup>({});
  const [groupData, setGroupData] = useState<{ [key: string]: string[] }>({});
  const [svgScale, setSvgScale] = useState({ scaleX: 1, scaleY: 1 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const isHoveredOrSelected = hoveredElement || selectedElement;

  const { panzoomInstance, interactionsLocked } = usePanzoom('venue-map');

  // Store initial transform state when panzoom instance becomes available
  //   useEffect(() => {
  //     if (panzoomInstance && !initialTransform) {
  //       // Wait a frame to ensure panzoom is fully initialized
  //       requestAnimationFrame(() => {
  //         const transform = panzoomInstance.getTransform();
  //         setInitialTransform({
  //           x: transform.x,
  //           y: transform.y,
  //           scale: transform.scale
  //         });
  //       });
  //     }
  //   }, [panzoomInstance, initialTransform]);

  useEffect(() => {
    // Wait for next frame to ensure SVG is fully rendered
    requestAnimationFrame(() => {
      const lookup = svgToLookup(svgRef.current);
      setElementLookup(lookup);

      // Also get grouped data
      const { elements, groups } = svgToLookupWithGroups(svgRef.current);
      setGroupData(groups);

      // Calculate scale between SVG viewBox and actual rendered size
      if (svgRef.current) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const viewBox = svgRef.current.viewBox.baseVal;
        const scaleX = svgRect.width / viewBox.width;
        const scaleY = svgRect.height / viewBox.height;
        setSvgScale({ scaleX, scaleY });
      }
    });
  }, []);

  // Apply hover effect to all SVG elements dynamically
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElements = svgRef.current.querySelectorAll('[id]:not(g)');

    svgElements.forEach((element) => {
      const svgElement = element as SVGElement;
      if (isHoveredOrSelected === null) {
        svgElement.style.opacity = '1';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else if (isHoveredOrSelected === element.id) {
        svgElement.style.opacity = '1';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else {
        svgElement.style.opacity = '0.3';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      }
    });
  }, [isHoveredOrSelected]);

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
    const element = elementLookup[id];
    if (!element || !panzoomInstance) return;

    // Use the parent container (the one that doesn't change with panzoom)
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Get current transform to understand current scale
    const currentTransform = panzoomInstance.getTransform();

    // Element center in SVG viewBox coordinates (from lookup)
    const elementCenterSvgX = element.centerX;
    const elementCenterSvgY = element.centerY;

    // Convert SVG coordinates to container coordinates (without panzoom scale)
    const elementContainerX = elementCenterSvgX * svgScale.scaleX;
    const elementContainerY = elementCenterSvgY * svgScale.scaleY;

    // Calculate how far we need to move to center the element
    // The moveTo coordinates are in transform space, not screen space
    // We want the element to appear at the center, so:
    // elementContainerX * scale + transform.x = centerX
    // Therefore: transform.x = centerX - (elementContainerX * scale)
    const targetX = centerX - elementContainerX * currentTransform.scale;
    const targetY = centerY - elementContainerY * currentTransform.scale;

    // Use moveTo with the calculated coordinates
    panzoomInstance.smoothMoveTo(
      targetX,
      targetY - 30 * (1 / currentTransform.scale) // Offset to account for the map pane that folds out on select
    );
  };

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    if (elementLookup[id] && !interactionsLocked) {
      // const isCurrentlySelected = selectedElement === id;
      // setSelectedElement(isCurrentlySelected ? null : id);

      setSelectedElement(id);

      // Focus on the element if it's being selected (not deselected)
      // if (!isCurrentlySelected) {
      focusOnElement(id);
      // }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden grow aspect-[1200/800] py-8"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedElement(null);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        setSelectedElement(null);
      }}
    >
      {/* Panzoom container */}
      <div
        id="venue-map"
        className="relative "
        onMouseOver={handleSVGMouseOver}
        onMouseOut={handleSVGMouseOut}
      >
        <MapTest ref={svgRef} onSVGElementClick={onSVGElementClick} />

        {/* Pin layer overlay - moves with the panzoom */}
        <div
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
        </div>
      </div>

      <MapPane
        selection={selectedElement}
        elementLookup={elementLookup}
        setSelectedElement={setSelectedElement}
      />

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              setSelectedElement(null);

              panzoomInstance.pause();

              panzoomInstance.moveTo(0, 0);
              panzoomInstance.zoomAbs(0, 0, 1);

              panzoomInstance.resume();
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              setSelectedElement(null);
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
