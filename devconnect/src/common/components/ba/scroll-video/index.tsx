import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import styles from './scroll-video.module.css'
// import InitialFrame from './initial-frame.webp'
// import { FancyLoader } from 'lib/components/loader/loader'

// Register ScrollTrigger plugin
gsap.registerPlugin(useGSAP, ScrollTrigger)

const amountOfScreenshots = 125
const hostedScreenshots = '/scroll-video'
const filenamePrefix = 'Oblisk_4K0' // Sequence is: Oblisk_4K0000, Oblisk_4K0001, Oblisk_4K0002, etc.
const extension = '.webp'

interface ScrollVideoProps {
  hasStableConnection?: boolean
  playInReverse?: boolean
  containerRef?: React.RefObject<HTMLDivElement>
  onScrollProgress?: (progress: number) => void
  onPlaybackFinish?: () => void
}

const ScrollVideoComponent = ({
  hasStableConnection = true,
  playInReverse = false,
  containerRef: externalContainerRef,
  onScrollProgress,
  onPlaybackFinish,
}: ScrollVideoProps) => {
  const internalContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = externalContainerRef || internalContainerRef
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [firstImageLoaded, setFirstImageLoaded] = useState(false)
  const [firstImage, setFirstImage] = useState<HTMLImageElement | null>(null)
  const [initialPlayComplete, setInitialPlayComplete] = useState(false)
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null)
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add overscroll-none to body on mount and remove on unmount
  useEffect(() => {
    // Add the class on mount
    document.body.classList.add('overscroll-none')

    // Remove the class on unmount
    return () => {
      document.body.classList.remove('overscroll-none')
    }
  }, [])

  // Disable/enable scrolling
  useEffect(() => {
    const disableScroll = (e: Event) => {
      if (!initialPlayComplete) {
        e.preventDefault()
        return false
      }
      return true
    }

    // Disable scrolling until initial play is complete
    if (!initialPlayComplete) {
      document.addEventListener('wheel', disableScroll, { passive: false })
      document.addEventListener('touchmove', disableScroll, { passive: false })
    } else {
      document.removeEventListener('wheel', disableScroll)
      document.removeEventListener('touchmove', disableScroll)
    }

    return () => {
      document.removeEventListener('wheel', disableScroll)
      document.removeEventListener('touchmove', disableScroll)
    }
  }, [initialPlayComplete])

  // Preload images
  useEffect(() => {
    // Calculate the first frame index based on playback direction
    const firstFrameIndex = playInReverse ? (amountOfScreenshots - 1).toString().padStart(3, '0') : '000'
    const firstFrameSrc = `${hostedScreenshots}/${filenamePrefix}${firstFrameIndex}${extension}`

    // Load the first frame immediately
    const firstImg = new Image()
    firstImg.src = firstFrameSrc
    firstImg.onload = () => {
      setFirstImageLoaded(true)
      setFirstImage(firstImg)

      // Draw the first frame on the canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Set canvas dimensions to match viewport
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight

          // Calculate dimensions to maintain aspect ratio while filling screen
          const imgAspect = firstImg.width / firstImg.height
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
          ctx.drawImage(firstImg, offsetX, offsetY, drawWidth, drawHeight)
        }
      }
    }

    if (!hasStableConnection) {
      // For unstable connections, just show the first frame and call onPlaybackFinish
      setIsLoading(false)
      if (onPlaybackFinish) {
        setTimeout(() => {
          setInitialPlayComplete(true)
          onPlaybackFinish()
        }, 500) // Small delay to ensure the frame is visible
      }
      return
    }

    // Set a timeout for loading all frames
    const loadTimeout = setTimeout(() => {
      // If we hit the timeout, treat as unstable connection
      if (isLoading && images.length < amountOfScreenshots) {
        console.warn('Image loading timeout reached, treating as unstable connection')
        setIsLoading(false)
        setInitialPlayComplete(true)
        if (onPlaybackFinish) {
          onPlaybackFinish()
        }
      }
    }, 10000) // 10 second timeout for loading all images

    loadTimeoutRef.current = loadTimeout

    const loadImages = async () => {
      setIsLoading(true)

      try {
        // Create array to hold all images
        const loadedImages: HTMLImageElement[] = new Array(amountOfScreenshots)

        // Add the first frame we already loaded
        const firstFrameIndex = playInReverse ? amountOfScreenshots - 1 : 0
        loadedImages[firstFrameIndex] = firstImg

        // Create an array of promises for loading all other images in parallel
        const loadPromises = []

        for (let i = 0; i < amountOfScreenshots; i++) {
          // Skip the first frame as we already loaded it
          if ((playInReverse && i === amountOfScreenshots - 1) || (!playInReverse && i === 0)) {
            continue
          }

          // Create a promise for loading this image
          const loadPromise = new Promise<void>((resolve, reject) => {
            const img = new Image()
            const index = i.toString().padStart(3, '0')
            img.src = `${hostedScreenshots}/${filenamePrefix}${index}${extension}`

            img.onload = () => {
              // Store the image in the correct position based on playback direction
              if (playInReverse) {
                loadedImages[amountOfScreenshots - 1 - i] = img
              } else {
                loadedImages[i] = img
              }
              resolve()
            }

            img.onerror = () => reject(new Error(`Failed to load image ${index}`))
          })

          loadPromises.push(loadPromise)
        }

        // Wait for all images to load in parallel
        await Promise.all(loadPromises)

        // Update state with all loaded images
        setImages(loadedImages)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading images:', error)
        // Handle loading error as unstable connection
        setIsLoading(false)
        setInitialPlayComplete(true)
        if (onPlaybackFinish) {
          onPlaybackFinish()
        }
      }
    }

    loadImages()

    return () => {
      // Clear timeout on cleanup
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [hasStableConnection, playInReverse, onPlaybackFinish])

  // Auto-play animation on load
  useEffect(() => {
    if (images.length === 0 || !hasStableConnection || initialPlayComplete) return

    const totalFrames = images.length - 1
    const duration = 3 // 3 seconds for the entire animation

    // Disable scroll trigger during auto-play if it exists
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.disable()
    }

    gsap.to(
      {},
      {
        duration,
        onUpdate: function () {
          const progress = this.progress()
          const frameIndex = playInReverse
            ? Math.round((1 - progress) * totalFrames)
            : Math.round(progress * totalFrames)

          setCurrentFrame(frameIndex)

          if (onScrollProgress) {
            onScrollProgress(Math.round(progress * 100))
          }
        },
        onComplete: () => {
          setInitialPlayComplete(true)
          // Re-enable scroll trigger after auto-play
          if (scrollTriggerRef.current) {
            scrollTriggerRef.current.enable()
          }

          // Call the onPlaybackFinish callback if provided
          if (onPlaybackFinish) {
            onPlaybackFinish()
          }
        },
      }
    )
  }, [images, hasStableConnection, playInReverse, initialPlayComplete, onScrollProgress, onPlaybackFinish])

  // Draw the current frame on the canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // If we have loaded images and are in stable connection mode
    if (images.length > 0 && hasStableConnection) {
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
    }
    // If we only have the first image loaded (unstable connection or still loading)
    else if (firstImage) {
      // This is handled in the firstImage onload handler, but we keep this as a fallback
    }
  }, [images, currentFrame, hasStableConnection, firstImage])

  // Set up ScrollTrigger
  useGSAP(() => {
    if (!containerRef.current || images.length === 0 || !hasStableConnection) return

    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom+=75% bottom',
      scrub: true,
      onUpdate: self => {
        // Calculate frame index based on scroll progress (0 to 1)
        const progress = self.progress

        // Report progress as 0-100 value if callback is provided
        if (onScrollProgress) {
          onScrollProgress(Math.round(progress * 100))
        }

        let frameIndex

        // After initial playthrough, we want to reverse the sequence direction
        // This means we're effectively starting from the end of the sequence
        const effectivelyReverse = !playInReverse

        if (effectivelyReverse) {
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

    // Store the ScrollTrigger instance for later use
    scrollTriggerRef.current = st

    // Initially disable ScrollTrigger until auto-play is complete
    if (!initialPlayComplete) {
      st.disable()
    }

    return () => {
      st.kill()
      scrollTriggerRef.current = null
    }
  }, [images, hasStableConnection, playInReverse, containerRef, onScrollProgress, initialPlayComplete])

  return (
    <div ref={containerRef} className={cn('w-screen relative h-screen')}>
      <div className="sticky top-0 w-full h-screen flex items-center justify-center">
        <canvas ref={canvasRef} className={cn('w-screen h-screen block object-cover', styles.fadeInOut)} />

        {isLoading && firstImageLoaded && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className={`bg-black/50 text-white px-4 py-2 rounded-full pulse ${styles.fadeInOutPulse}`}>
              Loading Devconnect location
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScrollVideoComponent
