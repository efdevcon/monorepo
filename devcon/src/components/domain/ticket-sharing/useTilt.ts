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

    // All gyro state lives in the closure — no stale refs, no cross-invocation leaks
    const CALIBRATION_COUNT = 10
    const EMA_ALPHA = 0.15 // Low-pass filter strength (0 = frozen, 1 = raw)
    const MAX_GAMMA = 45 // Clamp to avoid gimbal lock zone
    const MAX_BETA_DELTA = 30 // Max tilt from neutral

    const calibrationReadings: { gamma: number; beta: number }[] = []
    let calibrated = false
    let betaOffset = 0
    let filteredGamma = 0
    let filteredBeta = 0

    const handler = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return

      const gamma = e.gamma
      const beta = e.beta

      // Calibration: average first N readings for a stable neutral
      if (!calibrated) {
        calibrationReadings.push({ gamma, beta })
        if (calibrationReadings.length < CALIBRATION_COUNT) return

        betaOffset = calibrationReadings.reduce((s, r) => s + r.beta, 0) / CALIBRATION_COUNT
        filteredGamma = calibrationReadings.reduce((s, r) => s + r.gamma, 0) / CALIBRATION_COUNT
        filteredBeta = betaOffset
        calibrated = true
        return
      }

      // EMA low-pass filter — smooths noise and single-frame spikes
      // A gimbal lock flip (±60° in one frame) only moves the output by ±9°
      filteredGamma += (gamma - filteredGamma) * EMA_ALPHA
      filteredBeta += (beta - filteredBeta) * EMA_ALPHA

      // Clamp to safe ranges
      const clampedGamma = Math.max(-MAX_GAMMA, Math.min(MAX_GAMMA, filteredGamma))
      const betaDelta = Math.max(-MAX_BETA_DELTA, Math.min(MAX_BETA_DELTA, filteredBeta - betaOffset))

      targetRef.current = {
        x: clamp(clampedGamma / gammaSensitivity),
        y: clamp(betaDelta / betaSensitivity),
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
