import React from 'react'

type ColorButtonSvgProps = {
  color: string
  selected: boolean
}

export const ColorButtonSvg: React.FC<ColorButtonSvgProps> = ({ color, selected }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    {selected ? (
      <>
        <rect x="8.5" y="6.5" width="23" height="23" rx="0.5" stroke="white" />
        <rect x="11" y="9" width="18" height="18" fill={color} />
      </>
    ) : (
      <rect x="8" y="6" width="24" height="24" fill={color} />
    )}
  </svg>
)
