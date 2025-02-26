import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import NextImage from 'next/image'

// Register ScrollTrigger plugin
gsap.registerPlugin(useGSAP, ScrollTrigger)

const amountOfScreenshots = 125
const hostedScreenshots = '/scroll-video'
const filenamePrefix = 'Oblisk_4K0' // Sequence is: Oblisk_4K0000, Oblisk_4K0001, Oblisk_4K0002, etc.
const extension = '.webp'

interface ScrollVideoProps {
  hasStableConnection?: boolean
  playInReverse?: boolean
}

const ScrollVideoComponent = ({ hasStableConnection = true, playInReverse = false }: ScrollVideoProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [firstImageSrc, setFirstImageSrc] = useState('')

  // Preload images
  useEffect(() => {
    if (!hasStableConnection) {
      // Only load the first image for unstable connections
      const index = playInReverse ? (amountOfScreenshots - 1).toString().padStart(3, '0') : '000'
      setFirstImageSrc(`${hostedScreenshots}/${filenamePrefix}${index}${extension}`)
      setIsLoading(false)
      return
    }

    const loadImages = async () => {
      setIsLoading(true)
      const loadedImages: HTMLImageElement[] = []

      for (let i = 0; i < amountOfScreenshots; i++) {
        const img = new Image()
        const index = i.toString().padStart(3, '0')
        img.src = `${hostedScreenshots}/${filenamePrefix}${index}${extension}`

        await new Promise(resolve => {
          img.onload = resolve
        })

        loadedImages.push(img)
      }

      setImages(loadedImages)
      setIsLoading(false)
    }

    loadImages()
  }, [hasStableConnection, playInReverse])

  // Draw the current frame on the canvas
  useEffect(() => {
    if (images.length === 0 || !canvasRef.current || !hasStableConnection) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const img = images[Math.min(currentFrame, images.length - 1)]

    // Set canvas dimensions to match viewport
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Calculate dimensions to maintain aspect ratio while filling screen
    const imgAspect = img.width / img.height
    const canvasAspect = canvas.width / canvas.height

    let drawWidth,
      drawHeight,
      offsetX = 0,
      offsetY = 0

    if (canvasAspect > imgAspect) {
      // Canvas is wider than image aspect ratio
      drawWidth = canvas.width
      drawHeight = canvas.width / imgAspect
      offsetY = (canvas.height - drawHeight) / 2
    } else {
      // Canvas is taller than image aspect ratio
      drawHeight = canvas.height
      drawWidth = canvas.height * imgAspect
      offsetX = (canvas.width - drawWidth) / 2
    }

    // Draw image to fill canvas while maintaining aspect ratio
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
  }, [images, currentFrame, hasStableConnection])

  // Set up ScrollTrigger
  useGSAP(() => {
    if (!containerRef.current || images.length === 0 || !hasStableConnection) return

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => {
        // Calculate frame index based on scroll progress (0 to 1)
        const progress = self.progress
        let frameIndex

        if (playInReverse) {
          // When in reverse mode, we want to start from the last frame (when progress is 0)
          // and end at the first frame (when progress is 1)
          frameIndex = Math.floor((1 - progress) * (images.length - 1))
        } else {
          // Normal playback: start from first frame (when progress is 0)
          // and end at the last frame (when progress is 1)
          frameIndex = Math.floor(progress * (images.length - 1))
        }

        // Ensure frameIndex is within bounds
        frameIndex = Math.max(0, Math.min(frameIndex, images.length - 1))
        setCurrentFrame(frameIndex)
      },
    })
  }, [images, hasStableConnection, playInReverse])

  return (
    <div
      ref={containerRef}
      className={cn('w-screen relative', {
        'h-[100vh]': !hasStableConnection,
        'h-[300vh]': hasStableConnection,
      })}
    >
      <div className="sticky top-0 w-full h-screen flex items-center justify-center">
        {isLoading ? (
          <div className="text-white text-2xl">Loading...</div>
        ) : hasStableConnection ? (
          <canvas ref={canvasRef} className="w-screen h-screen block object-cover" />
        ) : (
          <div className="relative w-screen h-screen overflow-hidden">
            <NextImage src={firstImageSrc} alt="Scroll video first frame" fill priority className="object-cover" />
          </div>
        )}
      </div>
    </div>
  )
}

export default ScrollVideoComponent
