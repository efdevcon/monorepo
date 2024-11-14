import React from 'react'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
// import { Header } from 'components/common/layouts/header'
import { Hero } from 'components/domain/index/hero'
import DC7Logo from 'assets/images/dc-7/logo-flowers.png'
import DC7OverlayLeft from 'components/domain/index/hero/images/dc-7/left.png'
import DC7OverlayRight from 'components/domain/index/hero/images/dc-7/right.png'
// import { Footer } from 'components/common/layouts/footer'
// import css from './lantern.module.scss'
import Image from 'next/image'
import css from './lantern.module.scss'
import cn from 'classnames'
import LanternBG from 'assets/images/dc-7/lantern-bg.png'
import LanternPrism from 'assets/images/dc-7/lantern-prism.png'
import DevaSignature from 'assets/images/dc-7/deva-signature.png'

export default pageHOC(function SeaLocal(props: any) {
  return (
    <div className={cn(`${themes['index']} flex justify-center min-h-screen w-screen p-4`, css['lantern'])}>
      <Image
        src={LanternBG}
        alt="Lantern BG"
        className="fixed inset-0 z-[-1] object-center w-full object-contain h-[90vh] top-[5vh]"
      />
      <Image
        src={DC7OverlayLeft}
        alt="DC7 Overlay Left"
        className="fixed object-contain opacity-0 xl:opacity-100 object-left left-0 top-0 h-screen"
      />
      <Image
        src={DC7OverlayRight}
        alt="DC7 Overlay Right"
        className="fixed object-contain opacity-0 xl:opacity-100 object-right right-0 top-0 h-screen"
      />
      <div className="z-10 flex flex-col items-center relative">
        <div className="flex justify-between items-center border-bottom pb-4 mb-4 w-[630px] max-w-full">
          <div>
            <Image src={DC7Logo} alt="DC7 Logo" className="w-[90px]  object-contain mb-4" />
            <p className="text-base leading-[1.05em] font-bold">Dark Forest</p>
            <p className="text-base leading-[1.05em]">Illuminating Paper Lantern</p>
            <p className="text-base leading-[1.05em]">Builder Kit</p>
          </div>
          <div>
            <Image src={LanternPrism} alt="Lantern Prism" className="object-contain h-[71px] object-right" />
          </div>
        </div>

        <div className="w-[630px] max-w-full flex flex-col order-2 items-center md:flex-row gap-8 md:items-stretch text-xs">
          <div className="order-2 text-center mb-4 md:mb-0">
            <div className="text-left flex flex-col">
              <p className="mb-2 font-semibold text-sm">
                Here are your DIY instructions for the Dark Forest Illuminating Paper Lantern builder kit:
              </p>

              <ol className="list-decimal ml-4 mb-2">
                <li>
                  Lay out the parts provided: Paper panels, Wooden panels, glue stick, light string, rope, and tassel.
                </li>
                <li>Connect the edges that interlink for the wooden panels.</li>
                <li>Glue edges and let glue rest and dry faster by reducing glue amount and residue.</li>
                <li>Insert and attach next wooden panel and repeat process of gluing.</li>
                <li>Attach base panel with glue to the created triangle.</li>
                <li>Repeat process for second triangle.</li>
                <li>Glue bases together.</li>
                <li>Glue paper panels on Ethereum Lantern.</li>
                <li>Remove light battery safety paper.</li>
                <li>Insert light string and attach to top.</li>
                <li>Attach tassel to bottom of structure.</li>
                <li>Tie rope together on top for hanging lantern.</li>
              </ol>

              <p>
                The DIY lantern kit was designed for you to be able to travel with and build on your own in the comfort
                of your home. You are free to use tape or any other method to strengthen the structure and apply the
                paper panels. Remember to spark the change you want. Be positive-sum.
              </p>

              <p className="mt-4">Safe Travels home.</p>
              <Image src={DevaSignature} alt="Deva Signature" className="w-[70px] mt-2 object-contain self-center" />

              {/* <p className="mb-2 text-base">Required Parts:</p>
              <ul className="mb-4 ml-4">
                <li>Paper panels</li>
                <li>Wooden panels</li>
                <li>Glue stick</li>
                <li>Light string</li>
                <li>Rope</li>
                <li>Tassel</li>
              </ul>

              <p className="mb-2 text-base">Assembly Steps:</p>
              <ol className="ml-4">
                <li>Connect the edges that interlink for the wooden panels.</li>
                <li>Glue edges and let glue rest and dry faster by reducing glue amount and residue.</li>
                <li>Insert and attach next wooden panel and repeat process of gluing.</li>
                <li>Attach base panel with glue to the created triangle.</li>
                <li>Repeat process for second triangle.</li>
                <li>Glue bases together.</li>
                <li>Glue paper panels on Ethereum Lantern.</li>
                <li>Remove light battery safety paper.</li>
                <li>Insert light string and attach to top.</li>
                <li>Attach tassel to bottom of structure.</li>
                <li>Tie rope together on top for hanging lantern.</li>
              </ol>

              <p className="mt-4">
                The DIY lantern kit was designed for you to be able to travel with and build on your own in the comfort
                of your home. You are free to use tape or any other method to strengthen the structure and apply the
                paper panels. Remember to spark the change you want. Be positive-sum.
              </p> */}
            </div>
          </div>
          <div className="text-center flex items-center justify-center aspect-[873/1600] md:order-3 relative md:mb-0 shrink-0 sm:max-w-[200px] max-w-full md:self-start rounded-2xl overflow-hidden">
            {/* <div className={`${themes['lantern']}`}> */}
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/lZTWkomovec?si=1ZrBH52EBf-ITupe"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      {/* <Footer /> */}
    </div>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      page: {},
    },
  }
}
