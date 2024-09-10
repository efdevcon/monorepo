import { useTexture } from '@react-three/drei'
import { MeshMatcapMaterialProps } from '@react-three/fiber'
import React, { forwardRef } from 'react'
import { MeshMatcapMaterial, Texture } from 'three'

export const CustomMaterial = forwardRef<MeshMatcapMaterial, MeshMatcapMaterialProps>((props, ref) => {
  const matcap = 'spinner-texture.jpeg'
  const texture = useTexture(matcap) as Texture
  // eslint-disable-next-line
  return <meshMatcapMaterial {...props} ref={ref} matcap={texture} />
})

CustomMaterial.displayName = 'CustomMaterial'
