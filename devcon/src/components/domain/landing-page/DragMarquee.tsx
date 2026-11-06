import React, { useEffect, useRef } from 'react'

type DragMarqueeProps = {
  children: React.ReactNode
  /** Seconds for one full loop of the content at the idle speed. */
  loopSeconds?: number
  className?: string
}

// Looping marquee that people can also drag: mouse down + move on desktop,
// swipe on touch. The children are laid out twice; `x` is how far the track
// has been pulled left and wraps at one copy's width, so the loop is seamless
// in either direction. Idle, the track drifts at one loop per `loopSeconds`
// (paused while a mouse hovers, like the CSS marquee it replaces, and under
// prefers-reduced-motion — dragging still works there). On release the
// drag's velocity eases back into the idle drift instead of stopping dead.
// touch-action: pan-y leaves vertical page scrolling to the browser; only
// horizontal swipes reach the pointer handlers.
export const DragMarquee = ({ children, loopSeconds = 80, className = '' }: DragMarqueeProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const s = useRef({
    x: 0,
    loop: 0,
    vel: 0, // px/s in x terms (positive = content moving left)
    dragging: false,
    hovering: false,
    reduced: false,
    lastT: 0,
    lastX: 0,
    samples: [] as { t: number; x: number }[],
  })

  const apply = () => {
    const st = s.current
    if (st.loop > 0) st.x = ((st.x % st.loop) + st.loop) % st.loop
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${-st.x}px,0,0)`
  }

  useEffect(() => {
    const st = s.current
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMq = () => (st.reduced = mq.matches)
    onMq()
    mq.addEventListener('change', onMq)

    const copy = copyRef.current
    const ro = new ResizeObserver(() => {
      st.loop = copy?.offsetWidth ?? 0
      apply()
    })
    if (copy) ro.observe(copy)

    let raf = 0
    const tick = (t: number) => {
      const dt = st.lastT ? Math.min((t - st.lastT) / 1000, 0.05) : 0
      st.lastT = t
      if (st.loop > 0 && !st.dragging) {
        const idle = st.reduced || st.hovering ? 0 : st.loop / loopSeconds
        // Exponential approach (τ ≈ 0.6s) from the release velocity to idle.
        st.vel += (idle - st.vel) * (1 - Math.exp(-dt / 0.6))
        if (st.vel !== 0) {
          st.x += st.vel * dt
          apply()
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mq.removeEventListener('change', onMq)
    }
  }, [loopSeconds])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const st = s.current
    e.currentTarget.setPointerCapture(e.pointerId)
    st.dragging = true
    st.vel = 0
    st.lastX = e.clientX
    st.samples = [{ t: e.timeStamp, x: e.clientX }]
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = s.current
    if (!st.dragging) return
    st.x -= e.clientX - st.lastX
    st.lastX = e.clientX
    st.samples.push({ t: e.timeStamp, x: e.clientX })
    // Keep ~100ms of history for the release velocity.
    while (st.samples.length > 2 && e.timeStamp - st.samples[0].t > 100) st.samples.shift()
    apply()
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = s.current
    if (!st.dragging) return
    st.dragging = false
    const first = st.samples[0]
    const last = st.samples[st.samples.length - 1]
    const dt = last && first ? (last.t - first.t) / 1000 : 0
    // Pointer moving right pulls content right, i.e. x shrinks → negative vel.
    st.vel = dt > 0.016 ? Math.max(-3000, Math.min(3000, -(last.x - first.x) / dt)) : 0
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') s.current.hovering = true
  }
  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') s.current.hovering = false
  }

  return (
    <div
      className={`relative w-full overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div ref={trackRef} className="flex flex-nowrap w-max will-change-transform">
        <div ref={copyRef} className="flex shrink-0">
          {children}
        </div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}
