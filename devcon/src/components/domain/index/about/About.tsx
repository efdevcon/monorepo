import React from 'react'
import css from './about.module.scss'
import { Button } from 'components/common/button'
import Image from "next/legacy/image"
import Devcon2024Announcement from 'assets/images/2024-blog-post-shadow.png'
import TitleDevcon from 'assets/images/devcon-title.svg'
import { Link } from 'components/common/link'
import { ContentSection } from 'types/ContentSection'

interface Props {
  content: ContentSection
  recap?: boolean
}

const About = (props: Props) => {
  return (
    <div className={`section ${css['container']}`}>
      <div className={`${css['body']} clear-top`} id={props.recap ? 'recap' : 'update-2024'}>
        <div className={css['left']}>
          {props.recap ? (
            <h2 className="title spaced">Devcon Bogota Recap</h2>
          ) : (
            <TitleDevcon style={{ marginBottom: '24px' }} />
          )}

          <div className={`markdown`} dangerouslySetInnerHTML={{ __html: props.content.body }} />

          {/* <p>
            <span className={css['grey']}>
              <span className={css['crossed-out']}>2020</span> / <span className={css['crossed-out']}>2021</span> /
            </span>
            &nbsp;
            <span className="bold">2022</span> 🦄🎉
            <br />
            <span className="bold">Devcon Oct 11-14 📌 Agora Bogotá Convention Center</span>
            <br />
            <span className="font-sm">Devcon Week — October 7-16 in Bogotá, Colombia.</span>
          </p> */}

          {
            props.recap ? (
              <Link to="/past-events">
                <Button className="red bold">Past Events →</Button>
              </Link>
            ) : null
            // <Link to="https://blog.ethereum.org/2023/02/28/devcon-7-update/">
            //   <Button className="red bold">Blog Post →</Button>
            // </Link>
          }
        </div>
        <div className={css['right']}>
          {props.recap ? (
            <div className="aspect">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/lgTMm7J0t7c"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <Link to="https://blog.ethereum.org/2023/02/28/devcon-7-update/" className={css['image-container']}>
              <Image src={Devcon2024Announcement} alt="Devcon images" priority />
            </Link>
          )}
        </div>
      </div>
      <div className="clear-bottom margin-bottom border-bottom"></div>
    </div>
  )
}

export default About
