'use client';
// https://github.com/timmywil/panzoom
import { usePanzoom } from './panzoom';
import MapTest from './maps/MapTest';
import { useRef, useEffect, useState } from 'react';
import {
  svgToLookup,
  svgToLookupWithGroups,
  SVGLookup,
} from './utils/svgToLookup';
import { Pin } from './components/Pin';
import cn from 'classnames';
import css from './map.module.scss';

/*
    1) Zoom into element programatically by id (so we can use it via search params / url deep link)
    2) Place pin on elements
    3) Highlight elements
    4) Get current zoom level
    5) Show different parts of the map depending on the zoom level (low to high fidelity)
*/

const MapPane = (props: {
  selection: string | null;
  elementLookup: SVGLookup;
}) => {
  const { selection, elementLookup } = props;

  const element = selection ? elementLookup[selection] : null;

  console.log(element, 'SELECTION');

  return (
    <div
      className={cn(
        'absolute z-[1] bottom-0 left-0 right-0 border-t border-t-solid border-gray-200 p-4 transition-all duration-300 translate-y-[100%] opacity-0',
        selection && '!translate-y-[0%] opacity-100',
        css['map']
      )}
    >
      <div className={cn('text-sm font-bold', !selection && 'text-white')}>
        {element?.id || 'no-selection'}
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

  const panzoomInstance = usePanzoom('venue-map');

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

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    console.log('SVG element clicked:', id);
    if (elementLookup[id]) {
      setSelectedElement(selectedElement === id ? null : id);
      console.log('Element position data:', elementLookup[id]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[1200/800] overflow-hidden grow"
      onClick={() => setSelectedElement(null)}
      onTouchEnd={() => setSelectedElement(null)}
    >
      {/* Panzoom container */}
      <div
        id="venue-map"
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

      <MapPane selection={selectedElement} elementLookup={elementLookup} />

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            panzoomInstance?.smoothZoom(0, 0, 2);
          }}
        >
          +
        </button>
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            panzoomInstance?.smoothZoom(0, 0, 0.5);
          }}
        >
          -
        </button>
        <button
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            panzoomInstance?.smoothZoom(0, 0, 1);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
