import React, { forwardRef, useRef } from 'react';
import useSVGProps from './event-listeners';
import Map from './devconnect-map.svg';

interface MapTestProps {
  onSVGElementClick: (id: string, event: React.MouseEvent<SVGElement>) => void;
}

const MapTest = forwardRef<SVGSVGElement, MapTestProps>(
  ({ onSVGElementClick }, ref) => {
    const svgProps = { ...useSVGProps({ onSVGElementClick }), ref };

    return <Map {...svgProps} />;
  }
);

export default MapTest;
