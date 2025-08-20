import React, { useEffect } from 'react';
import { POI } from '@/data/poiData';

interface EventMapSVGProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  activeFilters: Set<string>;
  selectedPOI: POI | null;
  onSVGElementClick: (
    elementId: string,
    e?: React.MouseEvent | React.TouchEvent
  ) => void;
}

export const EventMapSVG: React.FC<EventMapSVGProps> = ({
  svgRef,
  activeFilters,
  onSVGElementClick,
}) => {
  // Smart highlighting logic using svgRef - only one district at a time
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    // Remove all highlight classes first
    svgElement.querySelectorAll('[id]').forEach((element) => {
      element.classList.remove('highlighted', 'dimmed');
    });

    // If no filters active, show everything normally
    if (activeFilters.size === 0) return;

    // Get the first (and only) active filter
    const activeFilter = Array.from(activeFilters)[0];
    if (!activeFilter) return;

    // Get all elements with IDs
    const allElements = svgElement.querySelectorAll('[id]');

    allElements.forEach((element) => {
      const elementId = element.id;

      // Check if this element belongs to the active category
      // Only highlight individual elements (defi-pancake-swap, defi-lido, etc.)
      // but NOT the district group element itself (defi, fnb, cowork, etc.)
      const isActive =
        elementId.startsWith(activeFilter + '-') ||
        (elementId.startsWith(activeFilter) && elementId !== activeFilter);

      // Check if this is a district group element or the main container
      const isDistrictGroup = ['event-map-svg-test', 'defi', 'fnb', 'cowork', 'biotech', 'hardware', 'social', 'coffee', 'toilets', 'art', 'swag', 'entrance'].includes(elementId);

      if (isActive) {
        element.classList.add('highlighted');
      } else if (!isDistrictGroup) {
        // Only dim non-district elements
        element.classList.add('dimmed');
      }
      // District group elements remain at normal opacity
    });
  }, [activeFilters, svgRef]);

  return (
    <>
      <style>
        {`
          .highlighted {
            opacity: 1 !important;
            transition: all 0.3s ease;
          }
          
          .dimmed {
            opacity: 0.4;
            transition: all 0.3s ease;
          }
          
          [id]:hover {
            opacity: 1 !important;
            cursor: pointer;
          }
        `}
      </style>
      <svg
        ref={svgRef}
        width="1200"
        height="800"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          cursor: 'pointer',
        }}
        onClick={(e) => {
          const target = e.target as SVGElement;
          if (target.id) {
            onSVGElementClick(target.id, e);
          }
        }}
      >
        <g id="event-map-svg-test">
          <g id="defi">
            <path
              id="defi-pancake-swap"
              d="M500.5 632L520.5 597L537.5 607L517.5 642L500.5 632Z"
              fill="#EE8822"
            />
            <path
              id="defi-lido"
              d="M416 596L433.5 586L453.5 621L436.5 631L416 596Z"
              fill="#EE8822"
            />
            <path
              id="defi-yearn"
              d="M481.5 610L504 623L494 641L471 628L481.5 610Z"
              fill="#74ACDF"
            />
            <rect
              id="defi-aave"
              x="434"
              y="548"
              width="68"
              height="34"
              fill="#74ACDF"
            />
            <rect
              id="defi-uniswap"
              x="503"
              y="568"
              width="33"
              height="14"
              fill="#EE8822"
            />
            <rect
              id="defi-compound"
              x="459"
              y="620.579"
              width="33"
              height="14"
              transform="rotate(-60 459 620.579)"
              fill="#EE8822"
            />
            <path
              id="defi-makerdao"
              d="M503 621L482 583.5H524.5L503 621Z"
              fill="#74ACDF"
            />
            <path
              id="defi-curve"
              d="M457 619.5L436 582H478.5L457 619.5Z"
              fill="#74ACDF"
            />
          </g>
          <g id="fnb">
            <rect
              id="fnb-1"
              x="287"
              y="676"
              width="28"
              height="48"
              fill="#FF85A6"
            />
            <rect
              id="fnb-2"
              x="287"
              y="583"
              width="28"
              height="88"
              fill="#FF85A6"
            />
            <rect
              id="fnb-3"
              x="287"
              y="197"
              width="28"
              height="40"
              fill="#FF85A6"
            />
            <rect
              id="fnb-4"
              x="280"
              y="84"
              width="34"
              height="40"
              fill="#FF85A6"
            />
          </g>
          <g id="cowork">
            <rect
              id="cowork-1"
              x="406"
              y="118"
              width="100"
              height="34"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-2"
              x="588"
              y="220"
              width="27"
              height="27"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-3"
              x="581"
              y="280"
              width="41"
              height="42"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-4"
              x="581"
              y="342"
              width="41"
              height="42"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-5"
              x="588"
              y="443"
              width="28"
              height="27"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-6"
              x="588"
              y="534"
              width="28"
              height="27"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-7"
              x="668.435"
              y="480.944"
              width="100.626"
              height="33.1673"
              transform="rotate(-11.0247 668.435 480.944)"
              fill="#AAEBA1"
            />
            <rect
              id="cowork-8"
              x="728"
              y="667"
              width="102"
              height="34"
              fill="#AAEBA1"
            />
          </g>
          <rect
            id="coffee-1"
            x="588"
            y="250"
            width="27"
            height="27"
            fill="#F50B0B"
          />
          <g id="coffee">
            <rect
              id="coffee-1_2"
              x="588"
              y="250"
              width="27"
              height="27"
              fill="#F50B0B"
            />
            <rect
              id="coffee-2"
              x="588"
              y="473"
              width="27"
              height="27"
              fill="#F50B0B"
            />
          </g>
          <g id="biotech">
            <path
              id="biotech-3-mile"
              d="M500.5 270L520.5 235L537.5 245L517.5 280L500.5 270Z"
              fill="#EE8822"
            />
            <path
              id="biotech-fukushima"
              d="M416 234L433.5 224L453.5 259L436.5 269L416 234Z"
              fill="#EE8822"
            />
            <path
              id="biotech-chernobyl"
              d="M481.5 248L504 261L494 279L471 266L481.5 248Z"
              fill="#74ACDF"
            />
            <rect
              id="biotech-horde"
              x="434"
              y="186"
              width="68"
              height="34"
              fill="#74ACDF"
            />
            <rect
              id="biotech-covenant"
              x="503"
              y="206"
              width="33"
              height="14"
              fill="#EE8822"
            />
            <rect
              id="biotech-doom"
              x="459"
              y="258.579"
              width="33"
              height="14"
              transform="rotate(-60 459 258.579)"
              fill="#EE8822"
            />
            <path
              id="biotech-unreal"
              d="M503 259L482 221.5H524.5L503 259Z"
              fill="#74ACDF"
            />
            <path
              id="biotech-black-mesa"
              d="M457 257.5L436 220H478.5L457 257.5Z"
              fill="#74ACDF"
            />
          </g>
          <g id="hardware">
            <path
              id="hardware-waymo"
              d="M453 340L433 375L416 365L436 330L453 340Z"
              fill="#EE8822"
            />
            <path
              id="hardware-golem"
              d="M537.5 376L520 386L500 351L517 341L537.5 376Z"
              fill="#EE8822"
            />
            <path
              id="hardware-tesla"
              d="M472 362L449.5 349L459.5 331L482.5 344L472 362Z"
              fill="#74ACDF"
            />
            <path
              id="hardware-ocean"
              d="M519.5 424L451.5 424L451.5 390L519.5 390V424Z"
              fill="#74ACDF"
            />
            <rect
              id="hardware-render"
              x="450.5"
              y="404"
              width="33"
              height="14"
              transform="rotate(180 450.5 404)"
              fill="#EE8822"
            />
            <rect
              id="hardware-akash"
              x="494.5"
              y="351.421"
              width="33"
              height="14"
              transform="rotate(120 494.5 351.421)"
              fill="#EE8822"
            />
            <path
              id="hardware-helium-iot"
              d="M450.5 351L471.5 388.5L429 388.5L450.5 351Z"
              fill="#74ACDF"
            />
            <path
              id="hardware-bittensor"
              d="M496.5 352.5L517.5 390H475L496.5 352.5Z"
              fill="#74ACDF"
            />
          </g>
          <g id="swag">
            <rect
              id="swag-1"
              x="435"
              y="720"
              width="67"
              height="62"
              fill="#E0AF7D"
            />
          </g>
          <g id="art">
            <rect
              id="art-exhibition"
              x="628"
              y="46.0083"
              width="94"
              height="99.3731"
              transform="rotate(-11.0449 628 46.0083)"
              fill="#EDDAB6"
            />
          </g>
          <g id="toilets">
            <rect
              id="toilet-mf-1"
              x="815"
              y="310.761"
              width="22"
              height="22"
              transform="rotate(-9.84437 815 310.761)"
              fill="#0000FF"
            />
            <rect
              id="toilet-dis-1"
              x="820"
              y="335.761"
              width="22"
              height="22"
              transform="rotate(-9.84437 820 335.761)"
              fill="#0000FF"
            />
          </g>
          <path
            id="boundary-walls"
            d="M369 783H871.626L822.703 521.243L824.669 520.874L874 785H367V731H273V729H367V488H369V783ZM318 582H316V488H318V582ZM728 21L811.9 458.147L809.937 458.526L726.384 23H588V21H728ZM318 352H316V77H260V75H318V352ZM535 23H369V352H367V23H274V21H535V23Z"
            fill="black"
          />
          <g id="entrance">
            <rect
              id="entrance-2"
              x="843.638"
              y="453.016"
              width="62.6483"
              height="34.1834"
              transform="rotate(78.8677 843.638 453.016)"
              fill="#E5EC10"
            />
            <rect
              id="entrance-3"
              x="535"
              y="14"
              width="53"
              height="17"
              fill="#E5EC10"
            />
            <rect
              id="entrance-1"
              x="369"
              y="352"
              width="136"
              height="53"
              transform="rotate(90 369 352)"
              fill="#E5EC10"
            />
          </g>
        </g>
      </svg>
    </>
  );
};
