import React from 'react'

type ColorButtonSvgProps = {
  color: string
  selected: boolean
}

export const ColorButtonSvg: React.FC<ColorButtonSvgProps> = ({ color, selected }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    <g filter="url(#filter0_d_293_34)">
      <rect x="8.5" y="6.5" width="25" height="25" rx="0.5" stroke={selected ? 'white' : 'transparent'} />
      <g filter="url(#filter1_d_293_34)">
        <rect x="11" y="9" width="20" height="20" fill={color} />
      </g>
    </g>
  </svg>
)
