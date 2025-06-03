/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { colorKeys, colorMap } from 'common/components/ticket'
import { SEO } from 'common/components/SEO'
import { FARCASTE_HANDLE, SITE_URL, SOCIAL_HANDLE } from 'common/constants'
import Link from 'common/components/link/Link'
import cn from 'classnames'
import styles from 'common/components/ticket/styles.module.scss'
import IconArrowRight from 'assets/icons/arrow_right.svg'
import { ColorButtonSvg } from 'common/components/ticket/ColorButtonSvg'
import { ShareButton } from 'common/components/ticket/ShareButton'

// Import background images
import blueBg from '../../../../public/argentina/social-bg-img-blue.jpg'
import pinkBg from '../../../../public/argentina/social-bg-img-pink.jpg'
import yellowBg from '../../../../public/argentina/social-bg-img-yellow.jpg'

const backgroundImages = {
  blue: blueBg,
  pink: pinkBg,
  yellow: yellowBg,
}

export const ShareTicket = ({ name, color: initialColor }: { name: string; color: string }) => {
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

  const ticketLink = `/api/ticket/${name}/${color}/false`
  const currentUrl = `https://devconnect.org/argentina/ticket/${encodeURIComponent(name)}/${color}`

  // Update URL without triggering a route change
  useEffect(() => {
    if (mounted && router.isReady && color && name) {
      const newPath = `/argentina/ticket/${encodeURIComponent(name)}/${color}`
      if (window.location.pathname !== newPath) {
        window.history.replaceState({}, '', newPath)
      }
    }
  }, [color, router.isReady, name, mounted])

  // Update current image when color changes
  useEffect(() => {
    if (color) {
      const imageUrl = `/api/ticket/${name}/${color}/false`
      setCurrentImage(imageUrl)
    }
  }, [color, name])

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
          const imageUrl = `/api/ticket/${name}/${colorKey}/false`
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
  }, [name, mounted])

  const twitterShare = encodeURIComponent(`I'm going to Devconnect ARG!

Get your ${SOCIAL_HANDLE} ticket:`)
  const warpcastShare = encodeURIComponent(`I'm going to Devconnect ARG!

Get your ${FARCASTE_HANDLE} ticket: ${encodeURIComponent(currentUrl)}`)

  const linkedinShare = `I'm going to Devconnect ARG!%0A%0AGet your ticket: ${encodeURIComponent(currentUrl)}`

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
        backgroundPosition: 'center',
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
        imageUrl={`${SITE_URL.replace(/\/$/, '')}${ticketLink?.replace('/false', '/true')}`}
      />
      <div className="flex-1 flex flex-col items-center justify-center">
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
        <div style={{ width: '630px', maxWidth: '100vw' }}>
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
      </div>
      <div className="flex flex-col mt-10">
        <div className="text-center">
          <div className="text-white text-xl font-semibold mb-1">Share on</div>
          <div className="flex items-center gap-4">
            <a href={`https://x.com/intent/tweet?text=${twitterShare}&url=${currentUrl}`} target="_blank">
              <ShareButton platform="twitter" color={colorCode} />
            </a>
            <a
              href={`https://warpcast.com/~/compose?text=${warpcastShare}&embeds%5B%5D=${currentUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <ShareButton platform="farcaster" color={colorCode} />
            </a>
            <a onClick={() => setShowInstagramModal(true)} style={{ cursor: 'pointer' }}>
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

      {/* Instagram Share Modal */}
      {showInstagramModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowInstagramModal(false)}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Share on Instagram</h3>
            <ol className="list-decimal list-inside space-y-3 mb-6 text-black">
              <li>Download your ticket image by clicking the button below</li>
              <li>Open Instagram and create a new post or story</li>
              <li>Upload the downloaded ticket image</li>
              <li>Add the caption: "I'm going to Devconnect ARG! Get your ticket at devconnect.org"</li>
              <li>Add relevant hashtags: #DevconnectARG #Ethereum #Web3</li>
            </ol>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setShowInstagramModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#F58A36] text-white rounded hover:bg-[#f5a236]"
                onClick={async () => {
                  const response = await fetch(ticketLink)
                  const blob = await response.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'devconnect-ticket.png'
                  a.click()
                  setShowInstagramModal(false)
                }}
              >
                Download Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TicketPage = (props: any) => {
  if (!props.params?.slug || props.params.slug.length < 1) return null
  const [name, color = colorKeys[Math.floor(Math.random() * colorKeys.length)]] = props.params.slug
  return (
    <>
      <SEO {...props.seo} />
      <ShareTicket name={name} color={color} />
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
  const [name, color = colorKeys[Math.floor(Math.random() * colorKeys.length)]] = context.params.slug
  const ticketLink = `/api/ticket/${name}/${color}/true`

  return {
    props: {
      params: context.params,
      seo: {
        title: `${name}'s Devconnect ARG Ticket`,
        description: `${name} is going to Devconnect ARG! Get your ticket and join the community.`,
        imageUrl: `${SITE_URL.replace(/\/$/, '')}${ticketLink}`,
      },
    },
  }
}

export default TicketPage
