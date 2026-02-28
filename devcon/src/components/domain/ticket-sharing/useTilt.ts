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
  const mouseCleanupRef = useRef<(() => void) | null>(null)
  const orientationHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  const clamp = useCallback((v: number) => Math.max(-maxTilt, Math.min(maxTilt, v)), [maxTilt])

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
  }, [smoothing, clamp])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])

  const startGyro = useCallback(() => {
    // Remove mouse listener if active
    if (mouseCleanupRef.current) {
      mouseCleanupRef.current()
      mouseCleanupRef.current = null
    }

    setSource('gyroscope')

    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0
      const beta = e.beta || 0
      targetRef.current = {
        x: clamp(gamma / gyroSensitivity),
        y: clamp((beta - betaOffset) / gyroSensitivity),
      }
    }

    orientationHandlerRef.current = handler
    window.addEventListener('deviceorientation', handler)
  }, [clamp, gyroSensitivity, betaOffset])

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
    mouseCleanupRef.current = () => document.removeEventListener('mousemove', handler)
  }, [])

  // Gyroscope setup
  useEffect(() => {
    const hasDeviceOrientation = 'DeviceOrientationEvent' in window

    if (!hasDeviceOrientation) {
      initMouse()
      return
    }

    // Check if permission API exists (iOS 13+)
    const DOE = DeviceOrientationEvent as any
    if (typeof DOE.requestPermission === 'function') {
      // On iOS, fall back to mouse until user gesture triggers requestGyroPermission
      initMouse()
      return
    }

    // Android or older iOS — test if events actually fire
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
      if (orientationHandlerRef.current) {
        window.removeEventListener('deviceorientation', orientationHandlerRef.current)
      }
      if (mouseCleanupRef.current) {
        mouseCleanupRef.current()
      }
    }
  }, [initMouse, startGyro])

  // Request gyroscope permission (must be called from a user gesture on iOS)
  const requestGyroPermission = useCallback(async () => {
    const DOE = DeviceOrientationEvent as any
    if (typeof DOE.requestPermission !== 'function') return false

    try {
      const state = await DOE.requestPermission()
      if (state === 'granted') {
        startGyro()
        return true
      }
    } catch (err) {
      console.error('Gyroscope permission error:', err)
    }

    return false
  }, [startGyro])

  return { containerRef, source, requestGyroPermission }
}
