'use client';
// https://github.com/timmywil/panzoom
import { usePanzoom, PanzoomControls } from './panzoom';
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
  //   const [initialTransform, setInitialTransform] = useState<{x: number, y: number, scale: number} | null>(null);

  const isHoveredOrSelected = hoveredElement || selectedElement;

  const { panzoomInstance } = usePanzoom('venue-map');

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

    const targetZoom = 2;
    const container = document.getElementById('venue-map');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Calculate the target position to center the element
    const elementCenterX = element.centerX * svgScale.scaleX;
    const elementCenterY = element.centerY * svgScale.scaleY;

    // Calculate the pan offset needed to center the element after zoom
    const panX = centerX - elementCenterX * targetZoom;
    const panY = centerY - elementCenterY * targetZoom;

    // First zoom to target level, then pan to center the element
    panzoomInstance.zoomAbs(centerX, centerY, targetZoom);
    panzoomInstance.moveTo(panX, panY);
  };

  const onSVGElementClick = (
    id: string,
    event: React.MouseEvent<SVGElement>
  ) => {
    if (elementLookup[id]) {
      const isCurrentlySelected = selectedElement === id;
      setSelectedElement(isCurrentlySelected ? null : id);

      // Focus on the element if it's being selected (not deselected)
      if (!isCurrentlySelected) {
        focusOnElement(id);
      }
    }
  };

  const handleContainerEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[1200/800] overflow-hidden grow"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedElement(null);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        setSelectedElement(null);
      }}
      // Prevent all mouse events from propagating
      onMouseDown={handleContainerEvent}
      onMouseUp={handleContainerEvent}
      onMouseMove={handleContainerEvent}
      onMouseEnter={handleContainerEvent}
      onMouseLeave={handleContainerEvent}
      onMouseOver={handleContainerEvent}
      onMouseOut={handleContainerEvent}
      // Prevent touch events from propagating
      onTouchStart={handleContainerEvent}
      onTouchMove={handleContainerEvent}
      onTouchCancel={handleContainerEvent}
      // Prevent wheel/scroll events from propagating (for zoom)
      onWheel={handleContainerEvent}
      // Prevent pointer events from propagating
      onPointerDown={handleContainerEvent}
      onPointerUp={handleContainerEvent}
      onPointerMove={handleContainerEvent}
      onPointerEnter={handleContainerEvent}
      onPointerLeave={handleContainerEvent}
      onPointerCancel={handleContainerEvent}
      // Prevent context menu from propagating
      onContextMenu={handleContainerEvent}
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
          className="bg-white px-4 py-2 rounded shadow hover:bg-gray-100 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (panzoomInstance) {
              //   const currentTransform = panzoomInstance.getTransform();
              //   console.log('Current transform:', currentTransform);
              //   console.log('MinZoom:', panzoomInstance.getMinZoom());
              //   console.log('MaxZoom:', panzoomInstance.getMaxZoom());

              //   // The bug is that somehow we got below minZoom!
              //   // This shouldn't be possible - let's investigate

              //   panzoomInstance.zoomAbs(0, 0, 1);
              //   panzoomInstance.moveTo(0, 0);

              //   setTimeout(() => {
              //     console.log(
              //       panzoomInstance.getTransform(),
              //       'currentTransform delayed'
              //     );
              //   }, 1000);

              // Get the actual container center instead of using (0,0)
              const container = document.getElementById('venue-map');
              if (container) {
                // const rect = container.getBoundingClientRect();
                // const centerX = rect.width / 2;
                // const centerY = rect.height / 2;

                // console.log('Using center:', centerX, centerY);

                panzoomInstance.pause();

                // Use the container center as zoom origin
                panzoomInstance.moveTo(0, 0);
                panzoomInstance.zoomAbs(0, 0, 1);

                panzoomInstance.resume();

                setTimeout(() => {
                  console.log('After zoom:', panzoomInstance.getTransform());
                }, 100);
              }
            }
          }}
        >
          Reset View
        </button>
      </div>
    </div>
  );
};
