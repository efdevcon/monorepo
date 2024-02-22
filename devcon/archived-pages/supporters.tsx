import React from 'react'
import { PageHero } from 'components/common/page-hero'
import { FAQ } from 'components/domain/faq'
import Page from 'components/common/layouts/page'
import themes from './themes.module.scss'
import css from './supporters.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { useTranslations } from 'next-intl'
import { GetFAQ, GetPage, GetContentSections } from 'services/page'
import { getGlobalData } from 'services/global'
import { Tags } from 'components/common/tags'
import { Button } from 'components/common/button'
import { Snapshot } from 'components/common/snapshot'
import ArrowRight from 'assets/icons/arrow_right.svg'
import IconPeople from 'assets/icons/people.svg'
import { Link } from 'components/common/link'
import { AutoScroller } from 'components/domain/dips/overview/contribute/Contribute'
import HorizontalLooper from 'components/common/horizontal-looper'
import Image from 'next/legacy/image'
// impact
import wat from 'assets/images/supporters-page/impact/wat.png'
import l2beat from 'assets/images/supporters-page/impact/l2-beat.png'
import lodestar from 'assets/images/supporters-page/impact/lodestar.png'
import nethermind from 'assets/images/supporters-page/impact/nethermind.png'
import nimbus from 'assets/images/supporters-page/impact/nimbus.png'
import optimism from 'assets/images/supporters-page/impact/optimism.png'
import polygon from 'assets/images/supporters-page/impact/polygon.png'
import prysm from 'assets/images/supporters-page/impact/prysm.png'
import remix from 'assets/images/supporters-page/impact/remix.png'
import scroll from 'assets/images/supporters-page/impact/scroll.png'
import sigmaprime from 'assets/images/supporters-page/impact/sigma-prime.png'
import snek from 'assets/images/supporters-page/impact/snek.png'
import solidity from 'assets/images/supporters-page/impact/solidity.png'
import sourcify from 'assets/images/supporters-page/impact/sourcify.png'
import starkware from 'assets/images/supporters-page/impact/starkware.png'
import stereum from 'assets/images/supporters-page/impact/stereum.png'
import truefi from 'assets/images/supporters-page/impact/truefi.png'
import consensys from 'assets/images/supporters-page/impact/consensys.png'

// support
import aavegrants from 'assets/images/supporters-page/supporters/aave-grants.png'
import anoma from 'assets/images/supporters-page/supporters/anoma.png'
import ambire from 'assets/images/supporters-page/supporters/ambire.png'
import arbitrum from 'assets/images/supporters-page/supporters/arbitrum.png'
import blockdaemon from 'assets/images/supporters-page/supporters/blockdaemon.png'
import chainlink from 'assets/images/supporters-page/supporters/chainlink.png'
import chainsafe from 'assets/images/supporters-page/supporters/chainsafe.png'
import element from 'assets/images/supporters-page/supporters/element.png'
import ey from 'assets/images/supporters-page/supporters/ey.png'
import hashkey from 'assets/images/supporters-page/supporters/hashkey.png'
import imtoken from 'assets/images/supporters-page/supporters/im-token.png'
import lens from 'assets/images/supporters-page/supporters/lens.png'
import lido from 'assets/images/supporters-page/supporters/lido.png'
import livepeer from 'assets/images/supporters-page/supporters/livepeer.png'
import meson from 'assets/images/supporters-page/supporters/meson.png'
import metamask from 'assets/images/supporters-page/supporters/metamask.png'
import mew from 'assets/images/supporters-page/supporters/mew.png'
import openzeppelin from 'assets/images/supporters-page/supporters/open-zeppelin.png'
// import optimism from 'assets/images/supporters-page/supporters/optimism.png'
// import polygon from 'assets/images/supporters-page/supporters/polygon.png'
// import starkware from 'assets/images/supporters-page/supporters/starkware.png'
import push from 'assets/images/supporters-page/supporters/push.png'
import eea from 'assets/images/supporters-page/supporters/eea.png'
import radicle from 'assets/images/supporters-page/supporters/radicle.png'
import safe from 'assets/images/supporters-page/supporters/safe.png'
import santiment from 'assets/images/supporters-page/supporters/santiment.png'
import smarttokenlabs from 'assets/images/supporters-page/supporters/smart-token-labs.png'
import status from 'assets/images/supporters-page/supporters/status.png'
import swarm from 'assets/images/supporters-page/supporters/swarm.png'
import tenderly from 'assets/images/supporters-page/supporters/tenderly.png'
import thesis from 'assets/images/supporters-page/supporters/thesis.png'
import upshot from 'assets/images/supporters-page/supporters/upshot.png'
import HeroBackground from 'assets/images/pages/hero-bgs/get-involved.jpg'

/*
  Add links to everything
  Rename images
*/

/**
 *export interface Contributor {
  name: string
  url: string
  avatarUrl: string
}
        [Arbitrum](https://twitter.com/arbitrum), [Aztec](https://twitter.com/aztecnetwork),
        [Battlezips](https://twitter.com/Battlezips), BuidlGuild, [dApp Learning
        DAO](https://twitter.com/Dapp_Learning), [Dappnode](https://twitter.com/DAppNode),
        [Devfolio](https://twitter.com/devfolio), [Ethereum Name Service (ENS)](https://twitter.com/ensdomains),
        [Ethereum Protocol Fellowship (EPF)](https://fellowship.ethereum.foundation/), [Ecosystem Support Program
        (ESP)](https://twitter.com/EF_ESP), [EthereumOnArm](https://twitter.com/EthereumOnARM),
        [ethdotorg](https://twitter.com/ethdotorg), [ethstaker](https://twitter.com/ethStaker), [Formal
        Verification](https://fv.ethereum.org/), [Gitcoin DAO](https://twitter.com/gitcoin), [ITU
        Blockchain](https://twitter.com/ITUblockchain), [L2BEAT](https://twitter.com/l2beat),
        [Lodestar](https://twitter.com/lodestar_eth), [Nethermind](https://twitter.com/nethermindeth),
        [Nimbus](https://twitter.com/ethnimbus), [Optimism](https://twitter.com/OPLabsPBC),
        [Polygon](https://twitter.com/0xPolygon), [Prism](https://twitter.com/prism_protocol), [Protocol
        Guild](https://twitter.com/ProtocolGuild), [Remix](https://twitter.com/EthereumRemix),
        [Scroll](https://twitter.com/Scroll_ZKP), [Sigma Prime](https://twitter.com/sigp_io), [Snake
        Charmers](https://twitter.com/ETHSnakeCharmer), [Solidity](https://twitter.com/solidity_lang),
        [Sourcify](https://twitter.com/SourcifyEth), [Starknet](https://twitter.com/StarkNetEco),
        [Stereum](https://twitter.com/stereumdev), and [TrueFi](https://twitter.com/TrueFiEng)
 */

// const contributors = [
//   {
//     name: 'Arbitrum',
//     url: 'https://twitter.com/arbitrum',
//     avatarUrl: 'https://pbs.twimg.com/profile_images/1490751860461953029/046qIxwT_400x400.jpg',
//   },
//   {
//     name: 'Aztec',
//     url: 'https://twitter.com/aztecnetwork',
//     avatarUrl: 'https://pbs.twimg.com/profile_images/1490751860461953029/046qIxwT_400x400.jpg',
//   },
//   {
//     name: 'Battlezips',
//     url: 'https://twitter.com/Battlezips',
//     avatarUrl: 'https://pbs.twimg.com/profile_images/1490751860461953029/046qIxwT_400x400.jpg',
//   },
//   {
//     name: 'Arbitrum',
//     url: 'https://twitter.com/arbitrum',
//     avatarUrl: 'https://pbs.twimg.com/profile_images/1490751860461953029/046qIxwT_400x400.jpg',
//   },
//   {
//     name: 'Arbitrum',
//     url: 'https://twitter.com/arbitrum',
//     avatarUrl: 'https://pbs.twimg.com/profile_images/1490751860461953029/046qIxwT_400x400.jpg',
//   },
//   {
//     name: 'Arbitrum',
//     url: 'https://twitter.com/arbitrum',
//     avatarUrl: 'https://pbs.twimg.com/profile_images/1490751860461953029/046qIxwT_400x400.jpg',
//   },
// ]

const Images = () => {
  return (
    <div className={css['horizontal-scroller-images']}>
      <Link to="https://twitter.com/ProtocolGuild" className={css['image-wrapper']}>
        <Image src={wat} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/l2beat" className={css['image-wrapper']}>
        <Image src={l2beat} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/lodestar_eth" className={css['image-wrapper']}>
        <Image src={lodestar} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/nethermindeth" className={css['image-wrapper']}>
        <Image src={nethermind} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/ethnimbus" className={css['image-wrapper']}>
        <Image src={nimbus} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/OPLabsPBC" className={css['image-wrapper']}>
        <Image src={optimism} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/0xPolygon" className={css['image-wrapper']}>
        <Image src={polygon} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/prism_protocol" className={css['image-wrapper']}>
        <Image src={prysm} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/EthereumRemix" className={css['image-wrapper']}>
        <Image src={remix} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/Scroll_ZKP" className={css['image-wrapper']}>
        <Image src={scroll} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/sigp_io" className={css['image-wrapper']}>
        <Image src={sigmaprime} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/solidity_lang" className={css['image-wrapper']}>
        <Image src={solidity} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/SourcifyEth" className={css['image-wrapper']}>
        <Image src={sourcify} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/ETHSnakeCharmer" className={css['image-wrapper']}>
        <Image src={snek} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/StarkWareLtd" className={css['image-wrapper']}>
        <Image src={starkware} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/stereumdev" className={css['image-wrapper']}>
        <Image src={stereum} alt="Supporter graphic" />
      </Link>
      <Link to="https://twitter.com/TrueFiEng" className={css['image-wrapper']}>
        <Image src={truefi} alt="Supporter graphic" />
      </Link>
    </div>
  )
}

export default pageHOC(function SatelliteEvents(props: any) {
  const intl = useTranslations()
  const pageContext = usePageContext()
  const faqs = props.faqs.filter((faq: any) => faq.category.id === 'satellite')

  return (
    <Page theme={themes['teal']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Get Involved</span> }, { text: props.page.header }]}
        title={pageContext?.current?.title}
        navigation={[
          {
            title: intl('supporters_overview'),
            to: '#overview',
          },
          {
            title: intl('supporters_impact_booths'),
            to: '#booths',
          },
          {
            title: props.page.header,
            to: '#supporters',
          },
        ]}
      />

      <div className="section">
        <div className={`${css['page-body']} two-columns`} id="overview">
          <div className="left section-markdown">
            <h2 className="spaced" id="overview">
              {intl('supporters_overview')}
            </h2>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.page.body }} />
            <div className="links clear-top">
              <Link to="#booths" className="text-uppercase hover-underline font-lg bold">
                {intl('supporters_impact_booths')}
                <ArrowRight />
              </Link>
              <Link to="#supporters" className="text-uppercase hover-underline font-lg bold">
                {intl('supporters_program')}
                <ArrowRight />
              </Link>
            </div>
          </div>

          <div className="right">
            <h2 className="spaced">{intl('supporters_quadratic_funding')}</h2>
            <Snapshot
              items={[
                {
                  Icon: IconPeople,
                  title: (
                    <Link to="https://ethcolombia.clr.fund/" indicateExternal>
                      ETHColombia Quadratic Funding Round
                    </Link>
                  ),
                  left: '',
                  right: '',
                },
                {
                  Icon: IconPeople,
                  title: (
                    <Link to="https://ethcolombia.clr.fund/" indicateExternal>
                      Gitcoin
                    </Link>
                  ),
                  left: '',
                  right: '',
                },
                {
                  Icon: IconPeople,
                  title: (
                    <Link to="https://clr.fund/" indicateExternal>
                      CLR.FUND Open round
                    </Link>
                  ),
                  left: '',
                  right: '',
                },
                {
                  Icon: IconPeople,
                  title: (
                    <Link to="https://protocol-guild.readthedocs.io/en/latest/index.html" indicateExternal>
                      Protocol Guild
                    </Link>
                  ),
                  left: '',
                  right: '',
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="section padding-top">
        <h2 id="booths" className="spaced clear-top border-top">
          {props.sections['supporters-impact-booths'].title}
        </h2>
        <div className={`two-columns clear-bottom`}>
          <div className={`left section-markdown`}>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['supporters-impact-booths'].data.left }}
            />
          </div>
          <div className={`right markdown`}>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['supporters-impact-booths'].data.right }}
            />
          </div>
        </div>

        <div className={`${css['auto-scroller']} clear-top-less`}>
          <HorizontalLooper>
            <Images />
          </HorizontalLooper>
        </div>

        <div className="clear-bottom margin-bottom border-bottom" />
      </div>

      {/* <div className="section padding-top margin-bottom">
        <h2 id="supporters" className="spaced">
          {props.sections['supporters-program'].title}
        </h2>

        <div className={`two-columns clear-bottom border-bottom`}>
          <div className={`left`}>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['supporters-program'].data.left }}
            />
          </div>
          <div className={`right`}>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: props.sections['supporters-program'].data.right }}
            />
          </div>
        </div>
      </div> */}

      <div className={`section clear-bottom ${css['thanks']}`}>
        <h2 id="supporters" className="clear-bottom">
          {intl('supporters_announcing')}
        </h2>
        <div className={`${css['grid-images']} clear-bottom`}>
          <Link to="https://twitter.com/AaveAave" className={`${css['grid-image-wrapper']} ${css['smaller']}`}>
            <Image src={aavegrants} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/chainlink" className={css['grid-image-wrapper']}>
            <Image src={chainlink} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/ConsenSys" className={css['grid-image-wrapper']}>
            <Image src={consensys} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/element_fi" className={css['grid-image-wrapper']}>
            <Image src={element} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/EYnews" className={`${css['grid-image-wrapper']} ${css['smaller']}`}>
            <Image src={ey} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/LensProtocol" className={`${css['grid-image-wrapper']} ${css['smaller']}`}>
            <Image src={lens} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/OPLabsPBC" className={`${css['grid-image-wrapper']} ${css['smaller']}`}>
            <Image src={optimism} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/0xPolygon" className={css['grid-image-wrapper']}>
            <Image src={polygon} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/TokenScript" className={css['grid-image-wrapper']}>
            <Image src={smarttokenlabs} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/ethstatus" className={css['grid-image-wrapper']}>
            <Image src={status} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/ethswarm" className={css['grid-image-wrapper']}>
            <Image src={swarm} alt="Supporter graphic" />
          </Link>
        </div>

        <h2 className="clear-bottom">{intl('supporters_with_thanks')}</h2>
        <div className={`${css['grid-images']} clear-bottom`}>
          <Link to="https://twitter.com/AmbireAdEx" className={css['grid-image-wrapper']}>
            <Image src={ambire} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/anomanetwork" className={css['grid-image-wrapper']}>
            <Image src={anoma} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/BlockdaemonHQ" className={css['grid-image-wrapper']}>
            <Image src={blockdaemon} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/HashKeyGroup" className={css['grid-image-wrapper']}>
            <Image src={hashkey} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/imTokenOfficial" className={`${css['grid-image-wrapper']} ${css['smaller']}`}>
            <Image src={imtoken} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/LidoFinance" className={css['grid-image-wrapper']}>
            <Image src={lido} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/myetherwallet" className={css['grid-image-wrapper']}>
            <Image src={mew} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/safe" className={`${css['grid-image-wrapper']} ${css['smaller']}`}>
            <Image src={safe} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/santimentfeed" className={css['grid-image-wrapper']}>
            <Image src={santiment} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/StarkWareLtd" className={css['grid-image-wrapper']}>
            <Image src={starkware} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/TenderlyApp" className={css['grid-image-wrapper']}>
            <Image src={tenderly} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/thesis_co" className={css['grid-image-wrapper']}>
            <Image src={thesis} alt="Supporter Graphic" />
          </Link>
          <Link to="https://twitter.com/OpenZeppelin" className={css['grid-image-wrapper']}>
            <Image src={openzeppelin} alt="Supporter Graphic" />
          </Link>
        </div>
        <h2 className="clear-bottom">{intl('supporters_also_thanks')}</h2>
        <div className={`${css['grid-images']} clear-bottom`}>
          <Link to="https://twitter.com/OffchainLabs" className={css['grid-image-wrapper']}>
            <Image src={arbitrum} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/ChainSafeth" className={css['grid-image-wrapper']}>
            <Image src={chainsafe} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/EntEthAlliance" className={css['grid-image-wrapper']}>
            <Image src={eea} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/Livepeer" className={css['grid-image-wrapper']}>
            <Image src={livepeer} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/NetworkMeson" className={css['grid-image-wrapper']}>
            <Image src={meson} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/pushprotocol" className={css['grid-image-wrapper']}>
            <Image src={push} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/radicle" className={css['grid-image-wrapper']}>
            <Image src={radicle} alt="Supporter graphic" />
          </Link>
          <Link to="https://twitter.com/UpshotHQ" className={css['grid-image-wrapper']}>
            <Image src={upshot} alt="Supporter graphic" />
          </Link>
          {/* <div>
            <Link to="https://twitter.com/OffchainLabs">Arbitrum/Offchain Labs</Link>
          </div>
          <div>
            <Link to="https://twitter.com/ChainSafeth">Chainsafe</Link>
          </div>
          <div>
            <Link to="https://twitter.com/EntEthAlliance">Enterprise Ethereum Alliance (EEA)</Link>
          </div>
          <div>
            <Link to="https://twitter.com/Livepeer">Livepeer</Link>
          </div>
          <div>
            <Link to="https://twitter.com/NetworkMeson">Meson Network</Link>
          </div>
          <div>
            <Link to="https://twitter.com/pushprotocol">
              Push Protocol
            </Link>
          </div>
          <div>
            <Link to="https://twitter.com/radicle">Radicle</Link>
          </div>
          <div>
            <Link to="https://twitter.com/UpshotHQ">Upshot</Link>
          </div> */}
        </div>
        <h2 className="clear-bottom">{intl('supporters_rest')}</h2>
        <div className={`${css['grid-text']} clear-bottom`}>
          <div>
            <Link to="https://twitter.com/avblockchain">Alpha Virtual</Link>
          </div>
          <div>
            <Link to="https://twitter.com/alt_layer">Alt Research</Link>
          </div>
          <div>
            <Link to="https://twitter.com/cartesiproject">Cartesi</Link>
          </div>
          <div>
            <Link to="https://twitter.com/CeloOrg">Celo</Link>
          </div>
          <div>
            <Link to="https://twitter.com/DFG_OfficiaI">Digital Finance Group</Link>
          </div>
          <div>
            <Link to="https://twitter.com/EvmosOrg">Evmos</Link>
          </div>
          <div>
            <Link to="https://twitter.com/fenbushi">Fenbushi Capital</Link>
          </div>
          <div>
            <Link to="https://www.fireeyes.xyz/">Fireeyes</Link>
          </div>
          <div>
            <Link to="https://twitter.com/gitcoin">Gitcoin DAO</Link>
          </div>
          <div>
            <Link to="https://twitter.com/IOSGVC">IOSG Ventures</Link>
          </div>
          <div>
            <Link to="https://twitter.com/MetisDAO">Metis</Link>
          </div>
          <div>
            <Link to="https://twitter.com/OrchidProtocol">Orchid</Link>
          </div>
          <div>
            <Link to="https://twitter.com/POKTnetwork">Pokt Network</Link>
          </div>
          <div>
            <Link to="https://twitter.com/Rocket_Pool">Rocket Pool</Link>
          </div>
          <div>
            <Link to="https://twitter.com/SkaleNetwork">Skale Labs</Link>
          </div>
          <div>
            <Link to="https://spacemesh.io/">Spacemesh</Link>
          </div>
          <div>
            <Link to="https://twitter.com/trapesys">Trapesys</Link>
          </div>
          <div>
            <Link to="https://twitter.com/W3BCLOUD">W3bCloud</Link>
          </div>
        </div>
        <h2 className="clear-top">{intl('supporters_join_us')}</h2>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('supporters', context.locale)
  const sections = await GetContentSections(['supporters-program', 'supporters-impact-booths'], context.locale)

  return {
    props: {
      ...globalData,
      page,
      faqs: await GetFAQ(context.locale),
      sections,
    },
  }
}
