import React from 'react'
import css from './featured-speakers.module.scss'
import Image from 'next/image'
import { Button } from 'components/common/button'
import { Link } from 'components/common/link'
// import Layer1 from 'assets/images/tracks/big-icons/Layer 1 Protocol.svg'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import BrewsterKahle from './speaker-images/brewster-kahle.png'
import AyaMiyaguchi from './speaker-images/aya-miyaguchi.png'
import DannyRyan from './speaker-images/danny-ryan.png'
import EricWall from './speaker-images/eric-wall.png'
import BrunoMacaes from './speaker-images/bruno-macaes.png'
import PiaMancini from './speaker-images/pia-mancini.png'
import VekateshRao from './speaker-images/vekatesh-rao.png'
import TimBeiko from './speaker-images/tim-beiko.png'
import MaxSemenchuk from './speaker-images/max-semenchuk.png'
import VitalikButerin from './speaker-images/vitalik-buterin.png'
import KurtOpsahl from './speaker-images/kurt-opsahl.png'
import IXShells from './speaker-images/ix-shells.png'
// import Background from './speaker-images/background.png'
import { useTranslations } from 'next-intl'
import { useDraggableLink } from 'components/domain/devcon-week/schedule'
// import { useDr}
// import Background from 'assets/images/pages/program.svg'

type SpeakerProps = {
  name: string
  image: any
  appLink?: string
}

const Speaker = (props: SpeakerProps) => {
  const dragAttributes = useDraggableLink()

  const body = (
    <>
      <div className={css['text']}>
        {props.name.split(' ').map(partOfName => {
          return <p key={partOfName}>{partOfName}</p>
        })}
      </div>
      <Image src={props.image} alt={props.name} priority quality="100" />
    </>
  )

  return (
    <div className={css['speaker']}>
      {props.appLink ? (
        <Link {...dragAttributes} to={props.appLink} className={css['alignment']}>
          {body}
        </Link>
      ) : (
        <div className={css['alignment']}>{body}</div>
      )}
    </div>
  )
}

const FeaturedSpeakers = () => {
  const intl = useTranslations()

  return (
    <div className={`section`}>
      <h2 className="title spaced">{intl('keynote_speakers')}</h2>
      {/* <div className="section expand">
        <div className={css['background-title']}>Featured Speakers</div>
      </div> */}
      <div className={`${css['container']}`}>
        {/* <div className={css['background-logo']}>
          <Image src={Background}alt="Keynote speakers logo" />
        </div> */}
        <div className={css['background-title']}>{intl('featured_speakers')}</div>
        <SwipeToScroll noBounds scrollIndicatorDirections={{ left: true, right: true }}>
          <div className={css['speakers']}>
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/publishers-denial-of-digital-ownership-vs-decentralization/?tab=YouTube"
              name="Brewster Kahle"
              image={BrewsterKahle}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/opening-ceremonies-danny/?tab=YouTube"
              name="Danny Ryan"
              image={DannyRyan}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/opening-ceremonies-aya/?tab=YouTube"
              name="Aya Miyaguchi"
              image={AyaMiyaguchi}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/opening-ceremonies-vitalik/?tab=YouTube"
              name="Vitalik Buterin"
              image={VitalikButerin}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/the-future-is-collective/?tab=YouTube"
              name="Pia Mancini"
              image={PiaMancini}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/why-only-virtual-money-is-real-money/?tab=YouTube"
              name="Bruno Macaes"
              image={BrunoMacaes}
            />
            <Speaker name="IXShells" image={IXShells} />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/closing-ceremonies-kurt-opsahl/?tab=YouTube"
              name="Kurt Opsahl"
              image={KurtOpsahl}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/there-are-many-alternatives-unlocking-civilizational-hypercomplexity-with-ethereum/?tab=YouTube"
              name="Venkatesh Rao"
              image={VekateshRao}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/opening-ceremonies-tim/?tab=YouTube"
              name="Tim Beiko"
              image={TimBeiko}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/social-slashing/?tab=YouTube"
              name="Eric Wall"
              image={EricWall}
            />
            <Speaker
              appLink="https://archive.devcon.org/archive/watch/6/web3-in-the-ukraine-government-integration-and-impact/?tab=YouTube"
              name="Max Semenchuk"
              image={MaxSemenchuk}
            />
          </div>
        </SwipeToScroll>
      </div>

      <div className="border-bottom clear-bottom margin-bottom">
        <p className={`${css['description']} clear-bottom-less clear-top`}>{intl('keynote_subtext')}</p>

        <Button className="red bold" to="https://archive.devcon.org/archive/watch?edition=6&order=desc&sort=edition">
          {intl('keynote_view_archive')} →
        </Button>
      </div>
    </div>
  )
}

export default FeaturedSpeakers
