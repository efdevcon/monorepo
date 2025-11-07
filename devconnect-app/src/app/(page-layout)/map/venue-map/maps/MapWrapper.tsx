import React, { forwardRef, useRef } from 'react';
import useSVGProps from './event-listeners';
import Map from './map-14.svg';

interface MapTestProps {
  onSVGElementClick: (id: string, event: React.MouseEvent<SVGElement>) => void;
  onInteractionStart?: () => void;
}

const MapTest = forwardRef<SVGSVGElement, MapTestProps>(
  ({ onSVGElementClick, onInteractionStart }, ref) => {
    const svgProps = {
      ...useSVGProps({ onSVGElementClick, onInteractionStart }),
      ref,
    };

    return (
      <Map
        {...svgProps}
        viewBox="0 0 1091 951"
        style={{ overflow: 'visible' }}
      />
    );
  }
);

export default MapTest;
