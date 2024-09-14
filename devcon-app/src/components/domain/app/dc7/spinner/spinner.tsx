import { useGSAP } from '@gsap/react'
import { Center } from '@react-three/drei'
import gsap from 'gsap'
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { CustomMaterial } from './material'
import { Canvas } from '@react-three/fiber'

interface SpinnerProps {
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ className }) => {
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const cone1Ref = useRef<THREE.Mesh>(null)
  const cone2Ref = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  const [mounted, setMounted] = useState(false)

  useGSAP(() => {
    if (mounted && ring1Ref.current && ring2Ref.current && cone1Ref.current && cone2Ref.current && groupRef.current) {
      gsap
        .timeline({
          repeat: -1,
        })
        .to(
          ring1Ref.current.rotation,
          {
            z: `+=${Math.PI * 2}`,
            x: `+=${Math.PI * 2}`,

            duration: 8,
            ease: 'none',
          },
          0
        )
        .to(
          ring2Ref.current.rotation,
          {
            z: `-=${Math.PI * 2}`,
            x: `-=${Math.PI * 2}`,

            ease: 'none',
            duration: 8,
          },
          0
        )
        .to(
          groupRef.current.rotation,
          {
            y: Math.PI * 2,
            duration: 8,
            ease: 'none',
          },
          0
        )
    }
  }, [mounted])

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        camera={{
          zoom: 1,
        }}
      >
        <Center ref={groupRef}>
          <mesh ref={ring1Ref}>
            {/* eslint-disable-next-line */}
            <torusGeometry args={[2.1, 0.09]}></torusGeometry>
            <CustomMaterial></CustomMaterial>
          </mesh>
          {/* eslint-disable-next-line */}
          <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
            {/* eslint-disable-next-line */}
            <torusGeometry args={[1.8, 0.09]}></torusGeometry>
            <CustomMaterial></CustomMaterial>
          </mesh>
          <group scale={0.8}>
            {/* eslint-disable-next-line */}
            <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0]} ref={cone1Ref}>
              {/* eslint-disable-next-line */}
              <coneGeometry args={[1, 1.41, 4]}></coneGeometry>
              <CustomMaterial></CustomMaterial>
            </mesh>
            <mesh
              /* eslint-disable-next-line */
              position={[0, -0.8, 0]}
              /* eslint-disable-next-line */
              rotation={[-Math.PI, 0, 0]}
              ref={cone2Ref}
              /* eslint-disable-next-line */
              onAfterRender={() => setMounted(true)}
            >
              {/* eslint-disable-next-line */}
              <coneGeometry args={[1, 1.41, 4]}></coneGeometry>
              <CustomMaterial></CustomMaterial>
            </mesh>
          </group>
        </Center>
      </Canvas>
    </div>
  )
}
