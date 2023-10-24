import React, { useRef, useImperativeHandle } from 'react'
import confetti from 'canvas-confetti'
import css from './confetti.module.scss'

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export const Confetti = React.forwardRef((_, ref) => {
  const canvasRef = useRef<any>()

  useImperativeHandle(ref, () => ({
    start: () => {
      canvasRef.current.confetti = canvasRef.current.confetti || confetti.create(canvasRef.current, { resize: true })

      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = {
        particleCount: 50,
        spread: 100,
        scalar: 0.8,
        gravity: 0.5,
        origin: { y: 0.95 },
      }

      canvasRef.current.confetti(defaults)

      let interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        // since particles fall down, start a bit higher than random
        canvasRef.current.confetti(
          Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
        )
        canvasRef.current.confetti(
          Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
        )
      }, 250)
    },
  }))

  // Auto-play confetti when fully visible
  // useEffect(() => {
  //   const observer = new window.IntersectionObserver(
  //     entries => {
  //       const target = entries[0]

  //       if (target.intersectionRatio === 1) {
  //         ref.current.start()
  //       }
  //     },
  //     {
  //       threshold: 1,
  //     }
  //   )

  //   observer.observe(canvasRef.current)

  //   return () => {
  //     observer.unobserve(canvasRef.current)
  //   }
  // }, [])

  return (
    <div className={css['container']}>
      <canvas ref={canvasRef}></canvas>
    </div>
  )
})
