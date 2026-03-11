import { useEffect, useRef, useState, useCallback } from 'react'

export type InputSource = 'mouse' | 'gyroscope' | null

const MAX_TILT = 1
const LERP = 0.15
const GYRO_RANGE = 20 // ±20° from neutral = full tilt
const CALIBRATION_SAMPLES = 5

function clamp(v: number) {
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, v))
}

export function useTilt() {
  const [source, setSource] = useState<InputSource>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const currentRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const cleanupRef = useRef<(() => void) | null>(null)

  // Single animation loop — lerps current toward target and writes CSS vars
  useEffect(() => {
    const tick = () => {
      const c = currentRef.current
      const t = targetRef.current
      c.x += (t.x - c.x) * LERP
      c.y += (t.y - c.y) * LERP

      if (containerRef.current) {
        containerRef.current.style.setProperty('--tilt-x', c.x.toFixed(4))
        containerRef.current.style.setProperty('--tilt-y', c.y.toFixed(4))
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const startGyro = useCallback(() => {
    cleanupRef.current?.()
    setSource('gyroscope')

    // Calibrate from first N readings to get a stable neutral
    const samples: { gamma: number; beta: number }[] = []
    let baseGamma = 0
    let baseBeta = 0
    let calibrated = false

    const handler = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return

      if (!calibrated) {
        samples.push({ gamma: e.gamma, beta: e.beta })
        if (samples.length < CALIBRATION_SAMPLES) return
        baseGamma = samples.reduce((s, r) => s + r.gamma, 0) / samples.length
        baseBeta = samples.reduce((s, r) => s + r.beta, 0) / samples.length
        calibrated = true
        return
      }

      // Direct mapping — no extra filtering, the lerp in the animation loop handles smoothing
      targetRef.current = {
        x: clamp((e.gamma - baseGamma) / GYRO_RANGE),
        y: clamp((e.beta - baseBeta) / GYRO_RANGE),
      }
    }

    window.addEventListener('deviceorientation', handler)
    cleanupRef.current = () => window.removeEventListener('deviceorientation', handler)
  }, [])

  const initMouse = useCallback(() => {
    if ('ontouchstart' in window) {
      setSource(null)
      return
    }

    cleanupRef.current?.()
    setSource('mouse')

    const handler = (e: MouseEvent) => {
      targetRef.current = {
        x: ((e.clientX / window.innerWidth) - 0.5) * 2,
        y: ((e.clientY / window.innerHeight) - 0.5) * 2,
      }
    }

    document.addEventListener('mousemove', handler)
    cleanupRef.current = () => document.removeEventListener('mousemove', handler)
  }, [])

  // Auto-detect gyroscope, fall back to mouse
  useEffect(() => {
    let testHandler: ((e: DeviceOrientationEvent) => void) | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    const hasDeviceOrientation = 'DeviceOrientationEvent' in window
    const DOE = DeviceOrientationEvent as any
    const needsPermission = hasDeviceOrientation && typeof DOE.requestPermission === 'function'

    if (!hasDeviceOrientation || needsPermission) {
      initMouse()
    } else {
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
      cleanupRef.current?.()
    }
  }, [initMouse, startGyro])

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
