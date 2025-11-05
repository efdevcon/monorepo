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

    return <Map {...svgProps} />;
  }
);

export default MapTest;
