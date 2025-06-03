/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { colorKeys, colorMap } from 'common/components/ticket'
import { SEO } from 'common/components/SEO'
import { SITE_URL } from 'common/constants'
import Link from 'common/components/link/Link'
import cn from 'classnames'
import styles from 'common/components/ticket/styles.module.scss'
import IconArrowRight from 'assets/icons/arrow_right.svg'
import { ColorButtonSvg } from 'common/components/ticket/ColorButtonSvg'
import { ShareButton } from 'common/components/ticket/ShareButton'

export const ShareTicket = ({ name }: { name?: string }) => {
  const router = useRouter()
  const [color, setColor] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const imageCache = useRef<{ [key: string]: { src: string; element: HTMLImageElement } }>({})
  const hasPreloaded = useRef(false)
  const [currentImage, setCurrentImage] = useState<string>('')
  const hasInitialized = useRef(false)

  // Initialize color from URL when router is ready
  useEffect(() => {
    if (router.isReady && !hasInitialized.current) {
      const queryColor = router.query.color
      if (typeof queryColor === 'string' && colorKeys.includes(queryColor)) {
        setColor(queryColor)
      } else {
        setColor('blue')
      }
      hasInitialized.current = true
    }
  }, [router.isReady, router.query.color])

  const ticketLink = color ? `/api/ticket/${name}/${color}/false` : ''
  const currentUrl = color ? `https://devconnect.org/argentina/ticket/${name}?color=${color}` : ''

  // Update URL without triggering a route change
  useEffect(() => {
    if (router.isReady && color) {
      const url = new URL(window.location.href)
      const currentColor = url.searchParams.get('color')
      if (currentColor !== color) {
        url.searchParams.set('color', color)
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [color, router.isReady])

  // Update current image when color changes
  useEffect(() => {
    if (color && imageCache.current[color]) {
      setCurrentImage(imageCache.current[color].src)
    }
  }, [color])

  // Preload images for all colors
  useEffect(() => {
    if (!color) return // Don't start preloading until we have a color

    let mounted = true

    const preloadImages = async () => {
      if (hasPreloaded.current) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const promises = colorKeys.map(colorKey => {
        return new Promise<void>((resolve, reject) => {
          const imageUrl = `/api/ticket/${name}/${colorKey}/false`
          if (!imageCache.current[colorKey]) {
            const img = new Image()
            img.onload = () => {
              if (mounted) {
                imageCache.current[colorKey] = {
                  src: imageUrl,
                  element: img,
                }
                // Set current image if this is the initial color
                if (colorKey === color) {
                  setCurrentImage(imageUrl)
                }
                console.log(`Cached image for color: ${colorKey}`)
                resolve()
              }
            }
            img.onerror = () => {
              console.error(`Failed to preload image for color ${colorKey}`)
              reject()
            }
            img.src = imageUrl
          } else {
            console.log(`Using cached image for color: ${colorKey}`)
            resolve()
          }
        })
      })

      try {
        await Promise.all(promises)
        if (mounted) {
          hasPreloaded.current = true
          setIsLoading(false)
          console.log('All images preloaded:', Object.keys(imageCache.current))
        }
      } catch (error) {
        console.error('Error preloading images:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Start preloading immediately
    preloadImages()

    return () => {
      mounted = false
      hasPreloaded.current = false
    }
  }, [name, color])

  const twitterShare = `I'm going to Devconnect ARG! Get your ticket: ${currentUrl}`
  const warpcastShare = `I'm going to Devconnect ARG! Get your ticket: ${currentUrl}`

  const colorCode = color ? colorMap[color as keyof typeof colorMap].primary : ''

  const handleColorChange = (colorKey: string) => {
    // Only change color if the image is already cached
    if (imageCache.current[colorKey]) {
      console.log(`Switching to color: ${colorKey}, image cached:`, !!imageCache.current[colorKey])
      setColor(colorKey)
    } else {
      console.log(`Cannot switch to color: ${colorKey}, image not cached`)
    }
  }

  // Log current cache state
  useEffect(() => {
    if (color) {
      console.log('Current color:', color)
      console.log('Current cache state:', Object.keys(imageCache.current))
      console.log('Current image cached:', !!imageCache.current[color])
    }
  }, [color])

  if (!color) {
    return null // Don't render anything until we have a color
  }

  return (
    <div
      style={{
        backgroundImage: `url(/argentina/social-bg-img-${color}.jpg)`,
        backgroundColor: '#74ACDF47',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SEO
        title="Devconnect ARG Tickets"
        description="Share your ticket with the world!"
        imageUrl={`${SITE_URL.replace(/\/$/, '')}${ticketLink?.replace('/false', '/true')}`}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 600,
        }}
      >
        Choose your vibe:{' '}
        {colorKeys.map(colorKey => {
          const isSelected = color === colorKey
          const primaryColor = colorMap[colorKey as keyof typeof colorMap].primary
          const isLoaded = !!imageCache.current[colorKey]
          return (
            <button
              key={colorKey}
              onClick={() => handleColorChange(colorKey)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: '10px',
                cursor: isLoaded ? 'pointer' : 'not-allowed',
                opacity: isLoaded ? 1 : 0.5,
              }}
              aria-label={colorKey}
              disabled={!isLoaded}
            >
              <ColorButtonSvg color={primaryColor} selected={isSelected} />
            </button>
          )
        })}
      </div>
      <div style={{ width: '630px', maxWidth: '100%' }}>
        {isLoading ? (
          <div
            style={{
              width: '100%',
              aspectRatio: '1200/630',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          ></div>
        ) : (
          <img
            src={currentImage || ticketLink}
            alt={`${name} - Devconnect ARG Ticket`}
            width="100%"
            height="auto"
            style={{ aspectRatio: '1200/630' }}
          />
        )}
      </div>
      <div className="flex flex-col mt-10">
        <Link href="http://tickets.devconnect.org/">
          <button
            className={cn(
              'border-solid border-b-[6px] group px-8 py-2 border-[#F58A36] text-[#36364C] text-xl font-semibold bg-[#ffa94e] hover:bg-[#f5a236] transition-colors hover:border-opacity-0',
              styles['tiled-button']
            )}
          >
            <div className="group-hover:translate-y-[3px] transition-transform flex items-center gap-2">
              Get your ticket
              <IconArrowRight className="w-4 h-4" />
            </div>
          </button>
        </Link>
      </div>
      <div className="flex flex-col mt-10">
        <div className="text-center">
          <div className="text-white text-xl font-semibold mb-1">Share on</div>
          <div className="flex items-center gap-4">
            <a href={`https://x.com/intent/tweet?text=${twitterShare}`} target="_blank">
              <ShareButton platform="twitter" color={colorCode} />
            </a>
            <a href={`https://warpcast.com/~/compose?text=${warpcastShare}`} target="_blank" rel="noreferrer">
              <ShareButton platform="farcaster" color={colorCode} />
            </a>
            <a href={`https://warpcast.com/~/compose?text=${warpcastShare}`} target="_blank" rel="noreferrer">
              <ShareButton platform="instagram" color={colorCode} />
            </a>
            <a
              href={`https://www.linkedin.com/feed/?shareActive&mini=true&text=${warpcastShare}`}
              target="_blank"
              rel="noreferrer"
            >
              <ShareButton platform="linkedin" color={colorCode} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

const TicketPage = (props: any) => {
  const router = useRouter()
  if (!props.params) return null
  return <ShareTicket name={props.params.name} />
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  return {
    props: {
      params: context.params,
    },
  }
}

export default TicketPage
