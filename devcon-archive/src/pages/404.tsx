import React from 'react'
import { useIntl } from 'gatsby-plugin-intl'
import { Header } from 'src/components/common/layouts/header'
import { PageHero } from 'src/components/common/page-hero'
import { graphql } from 'gatsby'
import { Link } from 'src/components/common/link'
import { pageHOC } from 'src/context/pageHOC'
import css from './404.module.scss'
import Img from 'gatsby-image'

export default pageHOC(function Index(props) {
  const intl = useIntl()

  const image = props.data.files.nodes[0]

  return (
    <div className={css['container']}>
      <Header withStrip={false} />
      <PageHero path={[{ text: '4 OH 4' }, { text: <b>{intl.formatMessage({ id: 'notfound_title' })}</b> }]}>
        <div className={css['image-container']}>
          <Img alt="" className={css['image']} fluid={image.childImageSharp.fluid} />
        </div>

        <div className={css['text']}>
          <h1 className={css['left']}>
            404 — <br />
            Page Not Found
          </h1>

          <div className={css['right']}>
            <p className={css['info']}>
              Sorry, seems like the page or file you were looking for does not exist at the specified url or went
              missing.
            </p>
            <Link to="/" className={css['go-back']}>
              Go back to the website
            </Link>
          </div>
        </div>
      </PageHero>
    </div>
  )
})

export const query = graphql`
  query ($language: String!) {
    ...NavigationData
    ...Notification
    files: allFile(filter: { relativePath: { in: ["404.png"] } }) {
      nodes {
        childImageSharp {
          fluid(maxWidth: 1200, quality: 80) {
            ...GatsbyImageSharpFluid_noBase64
          }
        }
      }
    }
  }
`
