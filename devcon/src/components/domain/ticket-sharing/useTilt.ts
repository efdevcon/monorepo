import { useEffect, useRef, useState, useCallback } from 'react'

interface TiltState {
  x: number
  y: number
}

interface UseTiltOptions {
  smoothing?: number
  maxTilt?: number
  gammaSensitivity?: number
  betaSensitivity?: number
}

export type InputSource = 'mouse' | 'gyroscope' | null

export function useTilt(options: UseTiltOptions = {}) {
  const {
    smoothing = 0.1,
    maxTilt = 1.2,
    gammaSensitivity = 25,
    betaSensitivity = 15,
  } = options

  const [source, setSource] = useState<InputSource>(null)

  const tiltRef = useRef<TiltState>({ x: 0, y: 0 })
  const targetRef = useRef<TiltState>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const mouseCleanupRef = useRef<(() => void) | null>(null)
  const orientationHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  // Gyro calibration & spike rejection
  const calibratedRef = useRef(false)
  const betaOffsetRef = useRef(0)
  const prevGammaRef = useRef(0)
  const prevBetaRef = useRef(0)

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
    calibratedRef.current = false

    const SPIKE_THRESHOLD = 30 // degrees — anything larger in one frame is a glitch or gimbal lock flip

    const handler = (e: DeviceOrientationEvent) => {
      // Skip invalid readings (null means sensor doesn't know)
      if (e.gamma === null || e.beta === null) return

      const gamma = e.gamma
      const beta = e.beta

      // Auto-calibrate: use first valid reading as neutral position
      if (!calibratedRef.current) {
        betaOffsetRef.current = beta
        prevGammaRef.current = gamma
        prevBetaRef.current = beta
        calibratedRef.current = true
        return
      }

      // Spike rejection: keep last good value if jump is too large
      let useGamma = gamma
      if (Math.abs(gamma - prevGammaRef.current) > SPIKE_THRESHOLD) {
        useGamma = prevGammaRef.current
      } else {
        prevGammaRef.current = gamma
      }

      let useBeta = beta
      if (Math.abs(beta - prevBetaRef.current) > SPIKE_THRESHOLD) {
        useBeta = prevBetaRef.current
      } else {
        prevBetaRef.current = beta
      }

      targetRef.current = {
        x: clamp(useGamma / gammaSensitivity),
        y: clamp((useBeta - betaOffsetRef.current) / betaSensitivity),
      }
    }

    orientationHandlerRef.current = handler
    window.addEventListener('deviceorientation', handler)
  }, [clamp, gammaSensitivity, betaSensitivity])

  // Mouse fallback (only on non-touch devices)
  const initMouse = useCallback(() => {
    if ('ontouchstart' in window) {
      // Touch device — don't listen for mouse events, they're synthetic and cause tilt snapping
      setSource(null)
      return
    }

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
    let testHandler: ((e: DeviceOrientationEvent) => void) | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    const hasDeviceOrientation = 'DeviceOrientationEvent' in window
    const DOE = DeviceOrientationEvent as any
    const needsPermission = hasDeviceOrientation && typeof DOE.requestPermission === 'function'

    if (!hasDeviceOrientation || needsPermission) {
      // No gyro support or iOS (needs user gesture) — start with mouse
      initMouse()
    } else {
      // Android or older iOS — test if events actually fire
      let received = false
      testHandler = (e: DeviceOrientationEvent) => {
        if (e.gamma !== null || e.beta !== null) {
          received = true
          window.removeEventListener('deviceorientation', testHandler!)
          testHandler = null
          startGyro()
        }
      }
      window.addEventListener('deviceorientation', testHandler)

      timeout = setTimeout(() => {
        if (!received) {
          if (testHandler) window.removeEventListener('deviceorientation', testHandler)
          testHandler = null
          initMouse()
        }
      }, 1000)
    }

    return () => {
      if (timeout) clearTimeout(timeout)
      if (testHandler) window.removeEventListener('deviceorientation', testHandler)
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
