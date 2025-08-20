export interface DistrictPosition {
  svgX: number
  svgY: number
}

export const districtPositions: Record<string, DistrictPosition> = {
  'defi-district': { svgX: 214.57, svgY: 328 },      // DeFi district center
  'social-district': { svgX: 214.57, svgY: 626.87 },  // Social district center  
  'hardware-district': { svgX: 214.57, svgY: 512.1 }, // Hardware district center
  'biotech-district': { svgX: 214.57, svgY: 219.5 }   // Biotech district center
}
