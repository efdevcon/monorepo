import React, { useEffect } from 'react'
import Link from 'common/components/link'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../tina/__generated__/client'
import Image from 'next/image'
import styles from './tickets.module.scss'
import cn from 'classnames'
import VoxelCar from 'assets/images/ba/voxel-car.jpg'
import PageTitle from 'assets/images/ba/subpage_devconnect_ticketing_2x.webp'
import { TICKETS_URL } from 'common/constants'

const Tickets = (props: any) => {
  useEffect(() => {
    // Redirect to external tickets page
    window.location.href = TICKETS_URL
  }, [])

  return (
    <>
      <Header active />
      <div className="relative h-[24vh] w-full text-black bg-black flex flex-col justify-end overflow-hidden">
        <Image
          src={VoxelCar}
          alt="Voxel art background"
          className={cn(styles.argentina, 'object-cover absolute object-[0%,90%] h-full w-full opacity-80')}
        />
        <div className="section z-10 pb-1">
          <div className="flex justify-between items-end">
            <Image src={PageTitle} alt="Page Title" className={'contain w-[500px] translate-x-[-3%]'} />
            <div className={cn(styles.shadow, 'gap-2 pb-3 text-white text-lg')}>
              17 — 22 November Buenos Aires, ARGENTINA
            </div>
          </div>
        </div>
        {/* <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div> */}
      </div>
      <div className="section">Tickets</div>
      <Footer />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'destino_devconnect.mdx' : locale + '/destino_devconnect.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      translations,
      locale,
      content,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(Tickets)
