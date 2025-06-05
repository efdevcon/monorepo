/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { colorKeys, colorMap } from 'common/components/ticket'
import { SEO } from 'common/components/SEO'
import { FARCASTE_HANDLE, SITE_URL, SOCIAL_HANDLE } from 'common/constants'
import Link from 'common/components/link/Link'
import cn from 'classnames'
import styles from 'common/components/ticket/styles.module.scss'
import { ColorButtonSvg } from 'common/components/ticket/ColorButtonSvg'
import { ShareButton } from 'common/components/ticket/ShareButton'
import { TiledButton } from 'common/components/ba/button'

// Import background images
import blueBg from '../../../../public/argentina/social-bg-img-blue.jpg'
import pinkBg from '../../../../public/argentina/social-bg-img-pink.jpg'
import yellowBg from '../../../../public/argentina/social-bg-img-yellow.jpg'

const backgroundImages = {
  blue: blueBg,
  pink: pinkBg,
  yellow: yellowBg,
}

export const ShareTicket = ({
  name,
  color: initialColor,
  random,
}: {
  name: string
  color: string
  random?: string
}) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [color, setColor] = useState(initialColor)
  const [showInstagramModal, setShowInstagramModal] = useState(false)
  const imageCache = useRef<{ [key: string]: { src: string; element: HTMLImageElement } }>({})
  const hasPreloaded = useRef(false)
  const [currentImage, setCurrentImage] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Keep color in sync with props
  useEffect(() => {
    if (mounted) {
      setColor(initialColor)
    }
  }, [initialColor, mounted])

  const ticketLink = `/api/ticket/${name}/${color}/transparent/${random}`
  const currentUrl = `https://devconnect.org/argentina/ticket/${encodeURIComponent(name)}/${color}${
    random ? `/${random}` : ''
  }`

  // Update URL without triggering a route change
  useEffect(() => {
    if (mounted && router.isReady && color && name) {
      const newPath = `/argentina/ticket/${encodeURIComponent(name)}/${color}${random ? `/${random}` : ''}`
      if (window.location.pathname !== newPath) {
        window.history.replaceState({}, '', newPath)
      }
    }
  }, [color, router.isReady, name, mounted, random])

  // Update current image when color changes
  useEffect(() => {
    if (color) {
      const imageUrl = `/api/ticket/${name}/${color}/transparent/${random}`
      setCurrentImage(imageUrl)
    }
  }, [color, name, random])

  // Preload images for all colors
  useEffect(() => {
    if (!mounted) return

    let isMounted = true

    const preloadImages = async () => {
      if (hasPreloaded.current) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const promises = colorKeys.map(colorKey => {
        return new Promise<void>((resolve, reject) => {
          const imageUrl = `/api/ticket/${name}/${colorKey}/transparent/${random}`
          if (!imageCache.current[colorKey]) {
            const img = new Image()
            img.onload = () => {
              if (isMounted) {
                imageCache.current[colorKey] = {
                  src: imageUrl,
                  element: img,
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
        if (isMounted) {
          hasPreloaded.current = true
          setIsLoading(false)
          console.log('All images preloaded:', Object.keys(imageCache.current))
        }
      } catch (error) {
        console.error('Error preloading images:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Start preloading immediately
    preloadImages()

    return () => {
      isMounted = false
      hasPreloaded.current = false
    }
  }, [name, mounted, random])

  const twitterShare =
    encodeURIComponent(`Just got my ${SOCIAL_HANDLE} ticket for the Ethereum World's Fair. Six days of real apps, stablecoins, onchain identity, DeFi, and more.

If you’re curious what Ethereum actually does, don't miss Devconnect. Nov 17–22 in Buenos Aires 🇦🇷

You coming?`)
  const warpcastShare =
    encodeURIComponent(`Just got my ${FARCASTE_HANDLE} ticket for the Ethereum World's Fair. Six days of real apps, stablecoins, onchain identity, DeFi, and more.

If you’re curious what Ethereum actually does, don't miss Devconnect. Nov 17–22 in Buenos Aires 🇦🇷

You coming? ${currentUrl}`)

  const linkedinShare = `🚀 Thrilled to share a personal milestone! 🚀

I’ve just locked in my ticket to the first-ever Ethereum World’s Fair at Devconnect Argentina (17 – 22 Nov, Buenos Aires) 🇦🇷✨

✅ Ethereum apps take center stage
✅ Buenos Aires = one of the most crypto-native markets on Earth 
✅ One intense week to ship, learn, and level-up alongside 10,000+ builders

If you’re serious about taking web3 from concept to concrete, Devconnect ARG is THE place to be.

See ya in BA!
${encodeURIComponent(currentUrl)}`

  const lensShare =
    encodeURIComponent(`Just got my @devcon ticket for the Ethereum World's Fair. Six days of real apps, stablecoins, onchain identity, DeFi, and more.

If you’re curious what Ethereum actually does, don't miss Devconnect. Nov 17–22 in Buenos Aires 🇦🇷

You coming?`)

  const colorCode = color ? colorMap[color as keyof typeof colorMap].primary : ''

  const handleColorChange = (colorKey: string) => {
    if (mounted) {
      setColor(colorKey)
    }
  }

  // Log current cache state
  useEffect(() => {
    if (color && mounted) {
      console.log('Current color:', color)
      console.log('Current cache state:', Object.keys(imageCache.current))
      console.log('Current image cached:', !!imageCache.current[color])
    }
  }, [color, mounted])

  if (!mounted) {
    return null
  }

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImages[color as keyof typeof backgroundImages]?.src || ''})`,
        backgroundColor: '#74ACDF47',
        backgroundSize: 'cover',
        backgroundPosition: color === 'pink' ? 'right' : 'center',
        padding: '20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <SEO
        title="Devconnect ARG Tickets"
        description="Share your ticket with the world!"
        imageUrl={`${SITE_URL?.replace('/transparent', '/social')}${ticketLink}`}
      />
      <div className="flex-1 flex flex-col items-center justify-center" style={{ marginTop: '157px' }}>
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
            console.log('colorKey', colorKey)
            console.log('isSelected', isSelected)
            console.log('primaryColor', primaryColor)
            return (
              <button
                key={colorKey}
                onClick={() => handleColorChange(colorKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                aria-label={colorKey}
              >
                <ColorButtonSvg color={primaryColor} selected={isSelected} />
              </button>
            )
          })}
        </div>
        <div style={{ width: '701px', maxWidth: '100vw' }}>
          {isLoading ? (
            <div
              style={{
                width: '100%',
                maxWidth: '100%',
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
              style={{ aspectRatio: '1200/630', maxWidth: '100%' }}
            />
          )}
        </div>
        <div className="flex flex-col mt-10">
          <Link href="http://tickets.devconnect.org/">
            <TiledButton
              icon={
                <svg
                  width="1em"
                  height="1em"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                >
                  <path d="M8 0 6.59 1.41 12.17 7H0v2h12.17l-5.58 5.59L8 16l8-8-8-8Z" fill="#242436"></path>
                </svg>
              }
            >
              Get your ticket
            </TiledButton>
          </Link>
        </div>
      </div>
      <div className="flex flex-col mt-10">
        <div className="text-center mb-8">
          <div className="text-white text-xl font-semibold mb-1">Share on</div>
          <div className="flex items-center">
            <a
              href={`https://x.com/intent/tweet?text=${twitterShare}&url=${encodeURIComponent(currentUrl)}`}
              target="_blank"
            >
              <ShareButton platform="twitter" color={colorCode} />
            </a>
            <a
              href={`https://farcaster.xyz/~/compose?text=${warpcastShare}&embeds%5B%5D=${currentUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <ShareButton platform="farcaster" color={colorCode} />
            </a>
            <a
              href={`https://hey.xyz/?text=${lensShare}&url=${encodeURIComponent(currentUrl)}`}
              target="_blank"
              rel="noreferrer"
            >
              <ShareButton platform="lens" color={colorCode} />
            </a>
            <a
              onClick={async () => {
                try {
                  const response = await fetch(ticketLink?.replace('/transparent', '/instagram'))
                  const blob = await response.blob()
                  const url = URL.createObjectURL(blob)

                  // Create canvas and load image
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  const img = await createImageBitmap(blob)

                  // Set canvas size to match image
                  canvas.width = img.width
                  canvas.height = img.height

                  // Draw image to canvas
                  ctx?.drawImage(img, 0, 0)

                  // Convert to shareable format
                  const shareBlob = await new Promise<Blob>(resolve => {
                    canvas.toBlob(blob => {
                      if (blob) resolve(blob)
                    }, 'image/png')
                  })

                  // Check if mobile device
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

                  // Share image if on mobile and sharing is supported
                  if (isMobile && navigator.share) {
                    await navigator.share({
                      files: [new File([shareBlob], 'devconnect-ticket.png', { type: 'image/png' })],
                    })
                  } else {
                    // Fallback to download for desktop or if sharing not supported
                    const shareUrl = URL.createObjectURL(shareBlob)
                    const a = document.createElement('a')
                    a.href = shareUrl
                    a.download = 'devconnect-ticket.png'
                    a.click()
                    URL.revokeObjectURL(shareUrl)
                  }

                  URL.revokeObjectURL(url)
                } catch (err) {
                  console.error('Error sharing image:', err)
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <ShareButton platform="instagram" color={colorCode} />
            </a>
            <a
              href={`https://www.linkedin.com/feed/?shareActive&mini=true&text=${linkedinShare}`}
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
  if (!props.params?.slug || props.params.slug.length < 1) return null
  const [
    name,
    color = colorKeys[Math.floor(Math.random() * colorKeys.length)],
    random = Math.random().toString(36).substring(2, 8),
  ] = props.params.slug
  return (
    <>
      <SEO {...props.seo} />
      <ShareTicket name={name} color={color} random={random} />
    </>
  )
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const [
    name,
    color = colorKeys[Math.floor(Math.random() * colorKeys.length)],
    random = Math.random().toString(36).substring(2, 8),
  ] = context.params.slug
  const ticketLink = `/api/ticket/${name}/${color}/social/${random}`

  return {
    props: {
      params: {
        ...context.params,
        slug: [name, color, random],
      },
      seo: {
        title: `${name}'s Devconnect ARG Ticket`,
        description: `${name} is going to Devconnect ARG! Get your ticket and join the community.`,
        imageUrl: `${SITE_URL.replace(/\/$/, '')}${ticketLink}`,
      },
    },
  }
}

export default TicketPage
