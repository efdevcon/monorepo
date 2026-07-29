import React from 'react'
import Head from 'next/head'
// import { useTranslations } from 'next-intl'
import { useRouter } from 'next/router'
import { SITE_URL } from 'utils/constants'
import { usePageContext } from 'context/page-context'
// import { EventMetadata } from './EventMetadata'

interface SEOProps {
  title?: string
  description?: string
  imageUrl?: string
  lang?: string
  canonicalUrl?: string
  type?: string
  separator?: string
  author?: {
    name?: string
    url?: string
  }
}

export function SEO(props: SEOProps) {
  const router = useRouter()
  const pageContext = usePageContext()
  const separator = props.separator ?? '—'

  let title = 'Devcon 7 SEA'
  if (pageContext?.current?.title && pageContext?.current?.title !== title) {
    title = `${pageContext?.current.title} ${separator} ${title}`
  } else if (props.title) {
    title = `${props.title} ${separator} ${title}`
  }

  // console.log(pageContext, 'page contxt hello')

  const globalTitle = 'Devcon 7 SEA'
  const globalDescription = 'Devcon is the Ethereum conference for developers, researchers, thinkers, and makers.'
  // Self-hosted, social-sized (1200x627, <300KB) — crawlers like X/WhatsApp drop
  // images near 5MB, and the old www.devcon.org URL added a cross-domain 301.
  const globalImage = `${SITE_URL}assets/images/dc7-og-social.jpg`

  let description = globalDescription
  if (props.description) {
    description = props.description
  }

  let lang = router?.locale || 'en'
  if (pageContext?.current?.lang) {
    lang = pageContext?.current.lang
  }
  if (props.lang) {
    lang = props.lang
  }

  let image = globalImage
  if (props.imageUrl) {
    image = props.imageUrl
  }

  // Pages that also exist on the current devcon.org site get noindex'd so the archive
  // doesn't compete in search. Deliberately NOT a cross-domain canonical: the contents
  // differ (DC7 vs current event) so Google ignores the hint, while social scrapers
  // (Telegram, iMessage) follow it and show the current event's card for archive links.
  const supersededByDevconOrg = [
    '/',
    '/about/',
    '/blogs/',
    '/code-of-conduct/',
    '/dips/',
    '/past-events/',
    '/privacy-notice/',
    '/road-to-devcon/',
    '/speaker-applications/',
    '/supporters/',
    '/terms-of-service/',
    '/tickets/',
  ]

  const siteUrl = SITE_URL
  // asPath excludes the locale prefix; strip query/hash and keep the trailing slash (trailingSlash: true)
  const path = (router?.asPath || '/').split(/[?#]/)[0]
  const normalizedPath = path.endsWith('/') ? path : `${path}/`
  const currentLocale = router?.locale && router.locale !== 'default' ? router.locale : 'en'
  const selfUrl = `${siteUrl}${currentLocale}${normalizedPath}`
  const canonical = props.canonicalUrl || selfUrl
  const noindex = supersededByDevconOrg.includes(normalizedPath)
  const url = selfUrl

  return (
    <>
      <Head>
        {/* title={title} titleTemplate={titleTemplate} htmlAttributes={{ lang: lang }}> */}

        {title && <title>{title}</title>}
        <meta name="description" key='description' content={description} />
        <meta name="image" key="image" content={image} />

        {globalTitle !== title && <meta property="og:site_name" key="og:site_name" content={globalTitle} />}
        <meta property="og:type" key="og:type" content={props.type ?? 'website'} />
        {url && <meta property="og:url" key="og:url" content={url} />}
        {title && <meta property="og:title" key="og:title" content={title} />}
        {description && <meta property="og:description" key="og:description" content={description} />}
        {image && <meta property="og:image" key="og:image" content={image} />}
        {image === globalImage && <meta property="og:image:width" key="og:image:width" content="1200" />}
        {image === globalImage && <meta property="og:image:height" key="og:image:height" content="627" />}
        {canonical && <link rel="canonical" key="canonical" href={canonical} />}
        {noindex && <meta name="robots" key="robots" content="noindex,follow" />}
        {props.author?.name && <link itemProp="name" href={props.author?.name} />}
        {props.author?.url && <link itemProp="url" href={props.author.url} />}

        {props.author?.name ||
          (props.author?.url && (
            <span itemProp="author" itemScope itemType="http://schema.org/Person">
              {props.author?.name && <link itemProp="name" href={props.author?.name} />}
              {props.author?.url && <link itemProp="url" href={props.author.url} />}
            </span>
          ))}

        <meta name="twitter:site" key="twitter:site" content='@efdevcon' />
        <meta name="twitter:creator" key="twitter:creator" content='@efdevcon' />
        <meta name="twitter:card" key="twitter:card" content='summary_large_image' />
        <meta name="twitter:title" key="twitter:title" content={title} />
        <meta name="twitter:description" key="twitter:description" content={description} />
        {image && <meta name="twitter:image" key="twitter:image" content={image} />}
      </Head>
      {/* <EventMetadata title={globalTitle} description={globalDescription} image={globalImage} /> */}
    </>
  )
}
