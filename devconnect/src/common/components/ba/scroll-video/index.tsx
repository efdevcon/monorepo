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
const hostedScreenshotsMobile = '/scroll-video/600p'
const filenamePrefix = 'Oblisk_4K0' // Sequence is: Oblisk_4K0000, Oblisk_4K0001, Oblisk_4K0002, etc.
const filenamePrefixMobile = filenamePrefix // 'Oblisk_4K_7200' // Sequence is: Oblisk_720p0000, Oblisk_720p0001, Oblisk_720p0002, etc.
const extension = '.webp'

interface ScrollVideoProps {
  hasStableConnection?: boolean
  playInReverse?: boolean
  containerRef?: React.RefObject<HTMLDivElement>
  onScrollProgress?: (progress: number) => void
  onPlaybackFinish?: () => void
  onUserPlaybackInterrupt?: () => void
}

const ScrollVideoComponent = ({
  hasStableConnection = true,
  playInReverse = false,
  containerRef: externalContainerRef,
  onScrollProgress,
  onPlaybackFinish,
  onUserPlaybackInterrupt,
}: ScrollVideoProps) => {
  const internalContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = externalContainerRef || internalContainerRef
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [firstImageLoaded, setFirstImageLoaded] = useState(false)
  const [firstImage, setFirstImage] = useState<HTMLImageElement | null>(null)
  const [initialPlayComplete, setInitialPlayComplete] = useState(false)
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null)
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const autoPlayAnimationRef = useRef<gsap.core.Tween | null>(null)
  const [showLoadingMessage, setShowLoadingMessage] = useState(false)

  // Detect if we're on mobile - determine immediately instead of using state
  const isMobileDevice =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isMobileRef = useRef(isMobileDevice)
  const [isMobile, setIsMobile] = useState(isMobileDevice)

  // Update mobile status on resize
  useEffect(() => {
    const checkMobile = () => {
      const isMobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      isMobileRef.current = isMobileCheck

      setIsMobile(isMobileCheck)
    }

    // Also check on resize in case of orientation changes
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    const handleUserInteraction = (e: Event) => {
      if (!initialPlayComplete && !isMobile) {
        // User is trying to scroll during initial playback (only for desktop)
        if (autoPlayAnimationRef.current) {
          // Kill the auto-play animation
          autoPlayAnimationRef.current.kill()
          autoPlayAnimationRef.current = null
        }

        // Set initial play as complete
        setInitialPlayComplete(true)

        // Call the interrupt callback if provided
        if (onUserPlaybackInterrupt) {
          onUserPlaybackInterrupt()
        }

        // Enable scroll trigger with a slight delay to ensure clean transition
        setTimeout(() => {
          if (scrollTriggerRef.current) {
            // Refresh ScrollTrigger to ensure proper positioning
            ScrollTrigger.refresh()
            scrollTriggerRef.current.enable()
          }
        }, 50)
      }
    }

    const disableScroll = (e: Event) => {
      // Only disable scrolling on desktop during initial playback
      if (!initialPlayComplete && !isMobile) {
        e.preventDefault()
        // Check if this is a user-initiated scroll (not our animation)
        handleUserInteraction(e)
        return false
      }
      return true
    }

    // Listen for user scroll attempts
    document.addEventListener('wheel', disableScroll, { passive: false })
    document.addEventListener('touchmove', disableScroll, { passive: false })

    return () => {
      document.removeEventListener('wheel', disableScroll)
      document.removeEventListener('touchmove', disableScroll)
    }
  }, [initialPlayComplete, onUserPlaybackInterrupt, isMobile])

  // Preload images
  useEffect(() => {
    // For mobile devices, only load and show the last frame
    if (isMobile) {
      const lastFrameIndex = (amountOfScreenshots - 1).toString().padStart(3, '0')
      const screenshotsPath = hostedScreenshotsMobile
      const prefix = filenamePrefixMobile
      const lastFrameSrc = `${screenshotsPath}/${prefix}${lastFrameIndex}${extension}`

      // Set loading state to true initially
      setIsLoading(true)
      if (onUserPlaybackInterrupt) {
        onUserPlaybackInterrupt()
      }

      const lastImg = new Image()
      lastImg.src = lastFrameSrc
      lastImg.onload = () => {
        setFirstImageLoaded(true)
        setFirstImage(lastImg)
        setInitialPlayComplete(true)
        setIsLoading(false) // Set loading to false when done

        // Draw the last frame on the canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          if (ctx) {
            // Set canvas dimensions to match viewport
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight

            // Calculate dimensions to maintain aspect ratio while filling screen
            const imgAspect = lastImg.width / lastImg.height
            const canvasAspect = canvas.width / canvas.height
            const isPortrait = canvasAspect < 1 // Check if device is in portrait mode

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

              // For portrait mode, align to the left side instead of center
              if (isPortrait) {
                offsetX = 0 // Left-align the image
              } else {
                offsetX = (canvas.width - drawWidth) / 2 // Center the image horizontally
              }
            }

            // Draw image to fill canvas while maintaining aspect ratio
            ctx.drawImage(lastImg, offsetX, offsetY, drawWidth, drawHeight)
          }
        }

        // Call onPlaybackFinish if provided
        if (onPlaybackFinish) {
          onPlaybackFinish()
        }
      }

      lastImg.onerror = () => {
        console.error('Failed to load mobile image:', lastFrameSrc)
        setIsLoading(false)
        setInitialPlayComplete(true)
        if (onPlaybackFinish) {
          onPlaybackFinish()
        }
      }

      return // Exit early for mobile
    }

    // Desktop logic continues below...
    // Calculate the first frame index based on playback direction
    const firstFrameIndex = playInReverse ? (amountOfScreenshots - 1).toString().padStart(3, '0') : '000'

    // Use mobile path and prefix for smaller screens
    const screenshotsPath = isMobile ? hostedScreenshotsMobile : hostedScreenshots
    const prefix = isMobile ? filenamePrefixMobile : filenamePrefix
    const firstFrameSrc = `${screenshotsPath}/${prefix}${firstFrameIndex}${extension}`

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
          const isPortrait = canvasAspect < 1 // Check if device is in portrait mode

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

            // For portrait mode, align to the left side instead of center
            if (isPortrait) {
              offsetX = 0 // Left-align the image
            } else {
              offsetX = (canvas.width - drawWidth) / 2 // Center the image horizontally
            }
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
      //   if (isLoading && images.length < amountOfScreenshots) {
      //     console.warn('Image loading timeout reached, treating as unstable connection')
      //     setIsLoading(false)
      //     setInitialPlayComplete(true)
      //     if (onPlaybackFinish) {
      //       onPlaybackFinish()
      //     }
      //   }
    }, 1000000) // 10 second timeout for loading all images

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

        // Use mobile path and prefix for smaller screens
        const screenshotsPath = isMobile ? hostedScreenshotsMobile : hostedScreenshots
        const prefix = isMobile ? filenamePrefixMobile : filenamePrefix

        for (let i = 0; i < amountOfScreenshots; i++) {
          // Skip the first frame as we already loaded it
          if ((playInReverse && i === amountOfScreenshots - 1) || (!playInReverse && i === 0)) {
            continue
          }

          // Create a promise for loading this image
          const loadPromise = new Promise<void>((resolve, reject) => {
            const img = new Image()
            const index = i.toString().padStart(3, '0')
            img.src = `${screenshotsPath}/${prefix}${index}${extension}`

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
  }, [hasStableConnection, playInReverse, onPlaybackFinish, isMobile])

  // Auto-play animation on load
  useEffect(() => {
    if (images.length === 0 || !hasStableConnection || initialPlayComplete) return

    const totalFrames = images.length - 1
    const duration = 4 // 4 seconds for the entire animation

    // Disable scroll trigger during auto-play if it exists
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.disable()
    }

    // Store the animation reference so we can kill it if user interrupts
    autoPlayAnimationRef.current = gsap.to(
      {},
      {
        duration,
        onUpdate: function () {
          const progress = this.progress()
          const frameIndex = playInReverse
            ? Math.round((1 - progress) * totalFrames)
            : Math.round(progress * totalFrames)

          setCurrentFrame(frameIndex)

          if (onScrollProgress && !isPlaying) {
            onScrollProgress(Math.round(progress * 100))
          }
        },
        onComplete: () => {
          setInitialPlayComplete(true)

          // Call the onPlaybackFinish callback if provided
          if (onPlaybackFinish) {
            onPlaybackFinish()
          }

          // Re-enable scroll trigger after auto-play with a slight delay, but only for desktop
          if (!isMobile) {
            setTimeout(() => {
              if (scrollTriggerRef.current) {
                // Refresh ScrollTrigger to ensure proper positioning
                ScrollTrigger.refresh()
                scrollTriggerRef.current.enable()
              }
            }, 50)
          }

          // Clear the animation reference
          autoPlayAnimationRef.current = null
        },
      }
    )

    return () => {
      // Clean up animation if component unmounts during playback
      if (autoPlayAnimationRef.current) {
        autoPlayAnimationRef.current.kill()
        autoPlayAnimationRef.current = null
      }
    }
  }, [
    images,
    hasStableConnection,
    playInReverse,
    initialPlayComplete,
    onScrollProgress,
    onPlaybackFinish,
    isPlaying,
    isMobile,
  ])

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
      const isPortrait = canvasAspect < 1 // Check if device is in portrait mode

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

        // For portrait mode, align to the left side instead of center
        if (isPortrait) {
          offsetX = 0 // Left-align the image
        } else {
          offsetX = (canvas.width - drawWidth) / 2 // Center the image horizontally
        }
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
    // Skip ScrollTrigger setup on mobile devices
    if (!containerRef.current || images.length === 0 || !hasStableConnection || isMobile) return

    // Clean up any existing ScrollTrigger instance
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.kill()
      scrollTriggerRef.current = null
    }

    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom+=100% bottom', // Extended end point
      scrub: 0.1, // Use a small value for smoother scrolling
      onUpdate: self => {
        if (onScrollProgress && !isPlaying) {
          onScrollProgress(self.progress * 100)
        }

        let frameIndex
        let progress = self.progress

        // Apply easing to the progress for smoother end transition
        // This applies a power2.out easing to the last 20% of the animation
        if (progress > 0.8) {
          // Map 0.8-1.0 to 0.0-1.0 for the easing calculation
          const easeProgress = (progress - 0.8) / 0.2
          // Apply power2.out easing: 1 - (1 - x)^2
          const easedEndProgress = 1 - Math.pow(1 - easeProgress, 2)
          // Remap to 0.8-1.0 range
          progress = 0.8 + easedEndProgress * 0.2
        }

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
  }, [
    images,
    hasStableConnection,
    playInReverse,
    containerRef,
    onScrollProgress,
    initialPlayComplete,
    isPlaying,
    isMobile,
  ])

  // Add effect to delay showing the loading message
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isLoading && firstImageLoaded) {
      timer = setTimeout(() => {
        setShowLoadingMessage(true)
      }, 300) // 2 second delay
    } else {
      setShowLoadingMessage(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isLoading, firstImageLoaded])

  return (
    <div ref={containerRef} className={cn('w-screen relative h-screen')}>
      <div className={cn('sticky top-0 w-full h-screen flex items-center justify-center')}>
        <canvas
          ref={canvasRef}
          className={cn(
            'w-screen h-screen block object-cover opacity-0',
            firstImageLoaded && 'opacity-100 transition-opacity duration-[1500ms]'
          )}
        />

        <div
          className={cn(
            `absolute inset-0 p-4 flex items-center justify-center transition-opacity duration-[1000ms] opacity-0 pointer-events-none`,
            isLoading && 'opacity-100 pointer-events-auto'
          )}
        >
          <div
            className={cn(
              `bg-black/30 text-white text-xs sm:text-sm px-4 py-2 rounded-full  ${styles.fadeInOutPulse}`,
              showLoadingMessage && 'opacity-100'
            )}
          >
            Loading Devconnect location. You can scroll to skip.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrollVideoComponent
