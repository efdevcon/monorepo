import { useTexture } from '@react-three/drei'
import { MeshMatcapMaterialProps } from '@react-three/fiber'
import React, { forwardRef } from 'react'

export const CustomMaterial = forwardRef<any, MeshMatcapMaterialProps>((props, ref) => {
  const matcap = 'spinner-texture.jpeg'
  const texture = useTexture(matcap)
  // eslint-disable-next-line
  return <meshMatcapMaterial {...props} ref={ref as any} matcap={texture as any} />
})

CustomMaterial.displayName = 'CustomMaterial'
