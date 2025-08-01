declare module 'react-swipeable-views-react-18-fix' {
  import React from 'react';

  interface SwipeableViewsProps {
    index?: number;
    onChangeIndex?: (index: number) => void;
    enableMouseEvents?: boolean;
    resistance?: boolean;
    style?: React.CSSProperties;
    children?: any;
  }

  const SwipeableViews: (props: SwipeableViewsProps) => any;
  export default SwipeableViews;
} 
