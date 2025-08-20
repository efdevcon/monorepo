import React from 'react';
import { Users, Utensils, Coffee, Cpu, Microscope, Palette, ShoppingBag, LogIn, DoorOpen, Briefcase, DollarSign } from 'lucide-react';
import { POI } from '@/data/poiData';
import { filterCategories } from '@/data/filterCategories';

interface EventMapSVGProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  transform: { x: number; y: number; scale: number };
  activeFilters: Set<string>;
  selectedPOI: POI | null;
  onSVGElementClick: (elementId: string, e?: React.MouseEvent | React.TouchEvent) => void;
  shouldDimCategory: (category: string) => boolean;
  getCategoryFilter: (category: string) => string;
  renderIcon: (IconComponent: React.ComponentType<any>, x: number, y: number, baseSize?: number) => React.JSX.Element;
}

export const EventMapSVG: React.FC<EventMapSVGProps> = ({
  svgRef,
  transform,
  activeFilters,
  onSVGElementClick,
  shouldDimCategory,
  getCategoryFilter,
  renderIcon,
}) => {
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 614.01 771"
      className="w-full h-full"
      style={{ minWidth: '614px', minHeight: '771px' }}
    >
      {/* Filter definitions for category highlights */}
      <defs>
        <filter id="cowork-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="defi-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#3b82f6" flood-opacity="0.4" />
        </filter>
        <filter id="biotech-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#9333ea" flood-opacity="0.4" />
        </filter>
        <filter id="hardware-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#f97316" flood-opacity="0.4" />
        </filter>
        <filter id="social-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#06b6d4" flood-opacity="0.4" />
        </filter>
        <filter id="coffee-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ef4444" flood-opacity="0.4" />
        </filter>
        <filter id="fnb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ec4899" flood-opacity="0.4" />
        </filter>
        <filter id="toilets-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#6b7280" flood-opacity="0.4" />
        </filter>
        <filter id="art-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#eab308" flood-opacity="0.4" />
        </filter>
        <filter id="swag-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#6366f1" flood-opacity="0.4" />
        </filter>
        <filter id="entrance-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#14b8a6" flood-opacity="0.4" />
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
          onClick={(e) => onSVGElementClick('swag', e)}
          onTouchEnd={(e) => onSVGElementClick('swag', e)}
        />
        {!shouldDimCategory('swag') && renderIcon(ShoppingBag, 208.5, 737, 18)}
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
          onClick={(e) => onSVGElementClick('art-exhibit-1', e)}
          onTouchEnd={(e) => onSVGElementClick('art-exhibit-1', e)}
        />
        {!shouldDimCategory('art-exhbition') && renderIcon(Palette, 424, 72, 20)}
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
          onClick={(e) => onSVGElementClick('toilet-mf', e)}
          onTouchEnd={(e) => onSVGElementClick('toilet-mf', e)}
        />
        {!shouldDimCategory('toilets') && renderIcon(Users, 567.7, 305.77, 12)}

        <rect
          id="toilet-dis"
          x="561.7"
          y="319.77"
          width="22"
          height="22"
          transform="translate(-48.1 102.74) rotate(-9.84)"
          fill="blue"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('toilet-dis', e)}
          onTouchEnd={(e) => onSVGElementClick('toilet-dis', e)}
        />
        {!shouldDimCategory('toilets') && renderIcon(Users, 572.7, 330.77, 12)}
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
          onClick={(e) => onSVGElementClick('fnb-4', e)}
          onTouchEnd={(e) => onSVGElementClick('fnb-4', e)}
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
          onClick={(e) => onSVGElementClick('fnb-3', e)}
          onTouchEnd={(e) => onSVGElementClick('fnb-3', e)}
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
          onClick={(e) => onSVGElementClick('fnb-2', e)}
          onTouchEnd={(e) => onSVGElementClick('fnb-2', e)}
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
          onClick={(e) => onSVGElementClick('fnb-1', e)}
          onTouchEnd={(e) => onSVGElementClick('fnb-1', e)}
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
          onClick={(e) => onSVGElementClick('defi-district', e)}
          onTouchEnd={(e) => onSVGElementClick('defi-district', e)}
        />
        {!shouldDimCategory('defi') && renderIcon(DollarSign, 214.57, 328, 18)}
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
          onClick={(e) => onSVGElementClick('biotech-district', e)}
          onTouchEnd={(e) => onSVGElementClick('biotech-district', e)}
        />
        {!shouldDimCategory('biotech') && renderIcon(Microscope, 214.57, 219.5, 18)}
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
          onClick={(e) => onSVGElementClick('hardware-district', e)}
          onTouchEnd={(e) => onSVGElementClick('hardware-district', e)}
        />
        {!shouldDimCategory('hardware') && renderIcon(Cpu, 214.57, 512.1, 18)}
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
          onClick={(e) => onSVGElementClick('coffee-stations', e)}
          onTouchEnd={(e) => onSVGElementClick('coffee-stations', e)}
        />
        {!shouldDimCategory('coffee') && renderIcon(Coffee, 341.5, 249.5, 12)}

        <rect
          id="coffee-2"
          x="328"
          y="236"
          width="27"
          height="27"
          fill="#f50b0b"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coffee-stations', e)}
          onTouchEnd={(e) => onSVGElementClick('coffee-stations', e)}
        />
        {!shouldDimCategory('coffee') && renderIcon(Coffee, 341.5, 249.5, 12)}

        <rect
          id="coffee-1"
          x="328"
          y="459"
          width="27"
          height="27"
          fill="#f50b0b"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coffee-stations', e)}
          onTouchEnd={(e) => onSVGElementClick('coffee-stations', e)}
        />
        {!shouldDimCategory('coffee') && renderIcon(Coffee, 341.5, 472.5, 12)}
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
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 196, 121, 16)}

        <rect
          id="cowork-7"
          x="328"
          y="206"
          width="27"
          height="27"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 341.5, 219.5, 12)}

        <rect
          id="cowork-6"
          x="321"
          y="266"
          width="41"
          height="42"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 341.5, 287, 14)}

        <rect
          id="cowork-5"
          x="321"
          y="328"
          width="41"
          height="42"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 341.5, 349, 14)}

        <rect
          id="cowork-4"
          x="328"
          y="429"
          width="28"
          height="27"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 342, 442.5, 12)}

        <rect
          id="cowork-3"
          x="328"
          y="520"
          width="28"
          height="27"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 342, 533.5, 12)}

        <rect
          id="cowork-2"
          x="410.65"
          y="457.07"
          width="100.63"
          height="33.17"
          transform="translate(-82.04 96.85) rotate(-11.02)"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 461, 473.6, 16)}

        <rect
          id="cowork-1"
          x="468"
          y="653"
          width="102"
          height="34"
          fill="#aaeba1"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('coworking-area', e)}
          onTouchEnd={(e) => onSVGElementClick('coworking-area', e)}
        />
        {!shouldDimCategory('cowork') && renderIcon(Briefcase, 519, 670, 16)}
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
          onClick={(e) => onSVGElementClick('entrance-east', e)}
          onTouchEnd={(e) => onSVGElementClick('entrance-east', e)}
        />
        {!shouldDimCategory('entrance') && renderIcon(DoorOpen, 573, 473, 14)}

        <rect
          id="entrance-north"
          x="275"
          y="0"
          width="53"
          height="17"
          fill="#e5ec10"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('entrance-north', e)}
          onTouchEnd={(e) => onSVGElementClick('entrance-north', e)}
        />
        {!shouldDimCategory('entrance') && renderIcon(DoorOpen, 301.5, 8.5, 12)}

        <rect
          id="entrance-west"
          x="56"
          y="338"
          width="53"
          height="136"
          fill="#e5ec10"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => onSVGElementClick('entrance-west', e)}
          onTouchEnd={(e) => onSVGElementClick('entrance-west', e)}
        />
        {!shouldDimCategory('entrance') && renderIcon(DoorOpen, 82.5, 406, 18)}
      </g>

      {/* Social District */}
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
          onClick={(e) => onSVGElementClick('social-district', e)}
          onTouchEnd={(e) => onSVGElementClick('social-district', e)}
        />
        {!shouldDimCategory('social') && renderIcon(Users, 214.57, 626.87, 18)}
      </g>
    </svg>
  );
};
