import React from 'react'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import Image from 'next/image'
import styles from '../calendar.module.scss'
import cn from 'classnames'
// import PageTitle from 'assets/images/ba/subpage_event_calendar_2x.webp'
import Voxel from 'assets/images/ba/voxel-car.jpg'
import RichText from 'lib/components/tina-cms/RichText'
import Perks from 'common/components/perks/perks'
import PageTitle from 'assets/images/perks-voxel.png'
import ZupassPodViewer from 'common/components/perks/ZupassPodViewer'

const PerksPage = (props: any) => {
  // const { data }: { data: any } = useTina(props.content)

  return (
    <>
      <Header active fadeOutOnScroll keepMenuOnScroll />
      <div className={cn('relative h-[28vh] w-full text-black bg-black flex flex-col justify-end overflow-hidden')}>
        <Image
          src={Voxel}
          alt="Voxel art background"
          className={cn(styles.argentina, 'object-cover absolute object-[100%,90%] h-full w-full opacity-80')}
        />

        <div className="section z-10 pb-1">
          <div className="flex justify-between items-end">
            <Image src={PageTitle} alt="Page Title" className={'contain w-[380px] translate-x-[-3%]'} />
            {/* <div className={cn(styles.shadow, 'gap-2 pb-3 text-white hidden md:block')}>Buenos Aires, ARGENTINA</div> */}
          </div>
        </div>

        <div className={styles['devconnect-overlay']}></div>
        {/* <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div> */}
      </div>

      <ZupassPodViewer />

      <Footer />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  // const path = locale === 'en' ? 'perks.mdx' : locale + '/perks.mdx'
  // const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      translations,
      locale,
      // content
    },
  }
}

export default withTranslations(PerksPage)
