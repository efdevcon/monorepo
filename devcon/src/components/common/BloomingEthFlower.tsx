import Lottie from 'lottie-react'
import { useState, useEffect } from 'react'

export function BloomingEthFlower({ className }: { className?: string }) {
  const [animationData, setAnimationData] = useState<object | null>(null)

  useEffect(() => {
    fetch('/mumbai/Eth-Glyph-Flower-Motion.json')
      .then(res => res.json())
      .then(setAnimationData)
  }, [])

  if (!animationData) return null

  return <Lottie animationData={animationData} loop className={className} />
}
