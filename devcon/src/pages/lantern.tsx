import React from 'react'
import themes from './themes.module.scss'
import DC7Logo from 'assets/images/dc-7/logo-flowers.png'
import DC7OverlayLeft from 'components/domain/index/hero/images/dc-7/left.png'
import DC7OverlayRight from 'components/domain/index/hero/images/dc-7/right.png'
import Image from 'next/image'
import css from './lantern.module.scss'
import cn from 'classnames'
import LanternBG from 'assets/images/dc-7/lantern-bg.png'
import LanternPrism from 'assets/images/dc-7/lantern-prism.png'
import DevaSignature from 'assets/images/dc-7/deva-signature.png'
import { useTranslations } from 'next-intl'

export default function SeaLocal(props: any) {
  const t = useTranslations('lantern')
  const steps = t.raw('steps') as string[]
  return (
    <div className={cn(`${themes['index']} flex justify-center min-h-screen w-screen p-4`, css['lantern'])}>
      <Image
        src={LanternBG}
        alt={t('lantern_bg_alt')}
        className="fixed inset-0 z-[-1] object-center w-full object-contain h-[90vh] top-[5vh]"
      />
      <Image
        src={DC7OverlayLeft}
        alt={t('overlay_left_alt')}
        className="fixed object-contain opacity-0 xl:opacity-100 object-left left-0 top-0 h-screen"
      />
      <Image
        src={DC7OverlayRight}
        alt={t('overlay_right_alt')}
        className="fixed object-contain opacity-0 xl:opacity-100 object-right right-0 top-0 h-screen"
      />
      <div className="z-10 flex flex-col items-center relative">
        <div className="flex justify-between items-center border-bottom pb-4 mb-4 w-[630px] max-w-full">
          <div>
            <Image src={DC7Logo} alt={t('dc7_logo_alt')} className="w-[90px]  object-contain mb-4" />
            <p className="text-base leading-[1.05em] font-bold">{t('title_line_1')}</p>
            <p className="text-base leading-[1.05em]">{t('title_line_2')}</p>
            <p className="text-base leading-[1.05em]">{t('title_line_3')}</p>
          </div>
          <div>
            <Image src={LanternPrism} alt={t('lantern_prism_alt')} className="object-contain h-[71px] object-right" />
          </div>
        </div>

        <div className="w-[630px] max-w-full flex flex-col order-2 items-center md:flex-row gap-8 md:items-stretch text-xs">
          <div className="order-2 text-center mb-4 md:mb-0">
            <div className="text-left flex flex-col">
              <p className="mb-2 font-semibold text-sm">{t('intro')}</p>

              <ol className="list-decimal ml-4 mb-2">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <p>{t('outro')}</p>

              <p className="mt-4">{t('safe_travels')}</p>
              <Image src={DevaSignature} alt={t('deva_signature_alt')} className="w-[70px] mt-2 object-contain self-center" />
            </div>
          </div>
          <div className="text-center flex items-center justify-center aspect-[873/1600] md:order-3 relative md:mb-0 shrink-0 sm:max-w-[200px] max-w-full md:self-start rounded-2xl overflow-hidden">
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
    </div>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {
      page: {},
    },
  }
}
