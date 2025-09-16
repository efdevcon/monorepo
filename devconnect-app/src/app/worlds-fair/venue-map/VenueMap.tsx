'use client';
// https://github.com/timmywil/panzoom
import React, { useRef, useEffect, useState } from 'react';
import Panzoom, { PanzoomObject } from '@panzoom/panzoom';
import MapTest from './maps/MapTest';
import {
  svgToLookup,
  svgToLookupWithGroups,
  SVGLookup,
} from './utils/svgToLookup';
import { Pin } from './components/Pin';
/*
    1) Zoom into element programatically
      ^ Get positions of SVGs dynamically, then use zoom library - OR even better, find a library that can do this for us
    2) Place pin on elements
      ^ Pins should also be positionable by SVG positions
    3) Highlight elements
      Element clicks should be registerable, so we can manipulate the SVG to highlight the element
    4) Get current zoom level
      Show different parts of the map depending on the zoom level (low to high fidelity)
    ...
*/

export const VenueMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panzoomRef = useRef<PanzoomObject>(null);
  let panzoom = panzoomRef.current;
  const panzoomContainerRef = useRef<HTMLDivElement | null>(null);
  const [elementLookup, setElementLookup] = useState<SVGLookup>({});
  const [groupData, setGroupData] = useState<{ [key: string]: string[] }>({});
  const [svgScale, setSvgScale] = useState({ scaleX: 1, scaleY: 1 });
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

    panzoom = panzoomRef.current = Panzoom(panzoomContainerRef.current!, {
      maxScale: 5,
      minScale: 0.3,
      // animate: true,
      duration: 200,
      // cursor: 'move',
    });

    const parent = panzoomContainerRef.current?.parentElement;

    if (parent) {
      parent.addEventListener('wheel', (e) => {
        e.preventDefault();
        panzoomRef.current?.zoomWithWheel(e);
      });
    }
  }, []);

  // Cleanup panzoom on unmount
  useEffect(() => {
    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
      }
    };
  }, []);

  // Apply hover effect to all SVG elements dynamically
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElements = svgRef.current.querySelectorAll('[id]:not(g)');

    svgElements.forEach((element) => {
      const svgElement = element as SVGElement;
      if (hoveredElement === null) {
        svgElement.style.opacity = '1';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else if (hoveredElement === element.id) {
        svgElement.style.opacity = '1';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      } else {
        svgElement.style.opacity = '0.3';
        svgElement.style.transition = 'opacity 0.5s ease-in-out';
      }
    });
  }, [hoveredElement]);

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

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    console.log('SVG element clicked:', id);
    if (elementLookup[id]) {
      console.log('Element position data:', elementLookup[id]);
    }
  };

  return (
    <div
      id="venue-map"
      ref={containerRef}
      className="relative w-full aspect-[1200/800] bg-gray-100"
    >
      {/* Panzoom container */}
      <div
        ref={panzoomContainerRef}
        className="relative"
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

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            panzoomRef.current?.zoomIn();
          }}
        >
          +
        </button>
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            panzoomRef.current?.zoomOut();
          }}
        >
          -
        </button>
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            panzoomRef.current?.reset();
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
