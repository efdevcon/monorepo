import React from 'react'
import { Helmet } from 'react-helmet'
import { useLocation } from '@reach/router'
import { useIntl } from 'gatsby-plugin-intl'
import { Twitter } from './Twitter'
import { ARCHIVE_TITLE, TITLE } from 'src/utils/constants'
import { usePageContext } from 'src/context/page-context'

interface SEOProps {
  title?: string
  description?: string
  imageUrl?: string
  lang?: string
  canonicalUrl?: string
  type?: string
  author?: {
    name?: string
    url?: string
  }
}

export function SEO(props: SEOProps) {
  const intl = useIntl()
  const location = useLocation()
  const pageContext = usePageContext()
  const isArchive = location.pathname.startsWith('/archive')

  let title = isArchive ? ARCHIVE_TITLE : TITLE
  if (pageContext?.current?.title) {
    title = pageContext?.current.title
  }
  if (props.title) {
    title = props.title
  }

  let description = intl.formatMessage({ id: 'rtd_intro' })
  if (pageContext?.current?.description) {
    description = pageContext?.current?.description
  }
  if (props.description) {
    description = props.description
  }

  let lang = intl.locale || intl.defaultLocale
  if (pageContext?.current?.lang) {
    lang = pageContext?.current.lang
  }
  if (props.lang) {
    lang = props.lang
  }
  if (isArchive) {
    lang ='en'
  }

  const globalTitle = isArchive ? ARCHIVE_TITLE : TITLE
  const titleTemplate = props.title || pageContext?.current?.title ? `%s · ${globalTitle}` : globalTitle
  const canonical = props.canonicalUrl || ''

  let image = 'https://www.devcon.org/assets/images/archive-social.png'
  if (props.imageUrl) {
    image = props.imageUrl
  }

  const siteUrl = location.origin
  const url = `${siteUrl}${location.pathname || '/'}`.replace(/\/$/, '')

  return (
    <>
      <Helmet title={title} titleTemplate={titleTemplate} htmlAttributes={{ lang: lang }}>
        <meta name="description" content={description} />
        <meta name="image" content={image} />

        {globalTitle !== title && <meta property="og:site_name" content={globalTitle} />}
        <meta property="og:type" content={props.type ?? 'website'} />
        {url && <meta property="og:url" content={url} />}
        {title && <meta property="og:title" content={title} />}
        {description && <meta property="og:description" content={description} />}
        {image && <meta property="og:image" content={image} />}
        {canonical && <link rel="canonical" href={canonical} />}
        {props.author?.name && <link itemProp="name" href={props.author?.name} />}
        {props.author?.url && <link itemProp="url" href={props.author.url} />}

        {props.author?.name ||
          (props.author?.url && (
            <span itemProp="author" itemScope itemType="http://schema.org/Person">
              {props.author?.name && <link itemProp="name" href={props.author?.name} />}
              {props.author?.url && <link itemProp="url" href={props.author.url} />}
            </span>
          ))}
      </Helmet>

      <Twitter title={title} description={description} image={image} />
    </>
  )
}
