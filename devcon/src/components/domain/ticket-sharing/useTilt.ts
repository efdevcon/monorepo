import { useEffect, useRef, useState, useCallback } from 'react'

interface TiltState {
  x: number
  y: number
}

interface UseTiltOptions {
  smoothing?: number
  maxTilt?: number
  gyroSensitivity?: number
  betaOffset?: number
}

export type InputSource = 'mouse' | 'gyroscope' | null

export function useTilt(options: UseTiltOptions = {}) {
  const { smoothing = 0.1, maxTilt = 1.2, gyroSensitivity = 25, betaOffset = 45 } = options

  const [source, setSource] = useState<InputSource>(null)

  const tiltRef = useRef<TiltState>({ x: 0, y: 0 })
  const targetRef = useRef<TiltState>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const useGyroRef = useRef(false)

  const clamp = (v: number) => Math.max(-maxTilt, Math.min(maxTilt, v))

  const animate = useCallback(() => {
    const tilt = tiltRef.current
    const target = targetRef.current

    tilt.x += (target.x - tilt.x) * smoothing
    tilt.y += (target.y - tilt.y) * smoothing
    tilt.x = clamp(tilt.x)
    tilt.y = clamp(tilt.y)

    if (containerRef.current) {
      containerRef.current.style.setProperty('--tilt-x', tilt.x.toFixed(4))
      containerRef.current.style.setProperty('--tilt-y', tilt.y.toFixed(4))
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [smoothing, maxTilt])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])

  // Mouse fallback
  const initMouse = useCallback(() => {
    setSource('mouse')

    const handler = (e: MouseEvent) => {
      targetRef.current = {
        x: ((e.clientX / window.innerWidth) - 0.5) * 2.4,
        y: ((e.clientY / window.innerHeight) - 0.5) * 2.4,
      }
    }

    document.addEventListener('mousemove', handler)
    return () => document.removeEventListener('mousemove', handler)
  }, [])

  // Gyroscope
  useEffect(() => {
    const hasDeviceOrientation = 'DeviceOrientationEvent' in window

    if (!hasDeviceOrientation) {
      const cleanup = initMouse()
      return cleanup
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0
      const beta = e.beta || 0

      targetRef.current = {
        x: clamp(gamma / gyroSensitivity),
        y: clamp((beta - betaOffset) / gyroSensitivity),
      }
    }

    const startGyro = () => {
      useGyroRef.current = true
      setSource('gyroscope')
      window.addEventListener('deviceorientation', handleOrientation)
    }

    // Check if permission API exists (iOS 13+)
    const DOE = DeviceOrientationEvent as any
    if (typeof DOE.requestPermission === 'function') {
      // On iOS, we need user gesture to request permission.
      // For now, fall back to mouse and expose requestPermission.
      const cleanup = initMouse()
      return cleanup
    }

    // Android or older iOS - test if events fire
    let received = false
    const testHandler = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null || e.beta !== null) {
        received = true
        window.removeEventListener('deviceorientation', testHandler)
        startGyro()
      }
    }
    window.addEventListener('deviceorientation', testHandler)

    const timeout = setTimeout(() => {
      if (!received) {
        window.removeEventListener('deviceorientation', testHandler)
        initMouse()
      }
    }, 1000)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('deviceorientation', testHandler)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  // Expose a method to request gyroscope permission (for iOS button trigger)
  const requestGyroPermission = useCallback(async () => {
    const DOE = DeviceOrientationEvent as any
    if (typeof DOE.requestPermission !== 'function') return false

    try {
      const state = await DOE.requestPermission()
      if (state === 'granted') {
        useGyroRef.current = true
        setSource('gyroscope')

        const handleOrientation = (e: DeviceOrientationEvent) => {
          const gamma = e.gamma || 0
          const beta = e.beta || 0
          targetRef.current = {
            x: clamp(gamma / gyroSensitivity),
            y: clamp((beta - betaOffset) / gyroSensitivity),
          }
        }

        window.addEventListener('deviceorientation', handleOrientation)
        return true
      }
    } catch (err) {
      console.error('Gyroscope permission error:', err)
    }

    return false
  }, [gyroSensitivity, betaOffset])

  return { containerRef, source, requestGyroPermission }
}
