import React from 'react'
import { useStaticQuery, graphql } from 'gatsby'
import Img from 'gatsby-image'
import css from './hero.module.scss'
import logo from 'src/assets/images/devcon-logo.svg'
import Rays from './svgs/Rays'
import IconEventNote from 'src/assets/icons/event_note.svg'
import { useIntl } from 'gatsby-plugin-intl'
import { TITLE } from 'src/utils/constants'
import { Link } from 'src/components/common/link'
import { CallToAction } from './call-to-action'

const parallax = (intersectionRatio: any) => {
  return {
    '--translateY': `${(100 - intersectionRatio) / 5}%`,
  }
}

// TO-DO: requestAnimationFrame (+ debounce?)
export const Hero = () => {
  const intl = useIntl()
  const heroEl = React.useRef(null)
  const [intersectionRatio, setIntersectionRatio] = React.useState(0)

  React.useLayoutEffect(() => {
    let options = {
      threshold: new Array(101).fill(0).map((v, i) => i * 0.01),
    }

    const callback = (entries: any) => {
      const { intersectionRatio } = entries[0]

      setIntersectionRatio(Math.floor(intersectionRatio * 100))
    }

    const observer = new IntersectionObserver(callback, options)

    const element: any = heroEl.current

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [])

  const data = useStaticQuery(graphql`
    query {
      allFile(filter: { relativePath: { in: ["clouds.png", "mountains.png", "shading.png"] } }) {
        nodes {
          childImageSharp {
            fluid(maxWidth: 1920, quality: 80) {
              ...GatsbyImageSharpFluid_noBase64
            }
          }
        }
      }
    }
  `)

  return (
    <>
      <div ref={heroEl} data-jest="hero" className={`${css['hero']}`}>
        {/* Grants some text visibility */}
        {/* <div className={css['shading']} /> */}
        {/* <img alt="" className={css['shading']} src={shading} /> */}
        {/* <Img alt="" className={css['shading']} fluid={data.allFile.nodes[0].childImageSharp.fluid} /> */}

        <Rays className={css['rays']} />

        <div className={css['mountain-container']}>
          <Img
            alt=""
            style={parallax(intersectionRatio)}
            className={css['mountains']}
            fluid={data.allFile.nodes[1].childImageSharp.fluid}
          />
          {/* <img alt="" style={parallax(intersectionRatio)} className={css['mountains']} src={mountains} /> */}
          {/* <Mountains style={parallax(intersectionRatio)} className={css['mountains']} /> */}
        </div>

        <div className={css['cloud-container']}>
          <Img
            alt=""
            style={parallax(intersectionRatio)}
            className={css['clouds']}
            fluid={data.allFile.nodes[2].childImageSharp.fluid}
          />
          {/* <img alt="" style={parallax(intersectionRatio)} className={css['clouds']} src={clouds} /> */}
          {/* <Clouds style={parallax(intersectionRatio)} className={css['clouds']} /> */}
        </div>

        <div className={css['left-rotated']}>
          <p className={css['text-uppercase']}>{intl.formatMessage({ id: 'subtitle' })}</p>
        </div>
        <div className={css['right-rotated']}>
          <p className={css['text-uppercase']}>{intl.formatMessage({ id: 'journey' })}</p>
        </div>

        <div className={css['logo-container']}>
          <img alt={TITLE} className={css['logo']} src={logo} />
        </div>

        <div className={css['date']}>
          <p className="h2">
            Aug 2021
            <br />
            10 → 13
          </p>
        </div>

        <CallToAction />

        <Link to="https://devcon.org/devcon.ics" className={css['calendar']}>
          <p>{intl.formatMessage({ id: 'description' })}</p>
          <button className="lg white ghost">
            <IconEventNote className={`icon ${css['icon']}`} />
            <p>{intl.formatMessage({ id: 'addtocalendar' })}</p>
          </button>
        </Link>
      </div>
      <CallToAction mobile />
    </>
  )
}
