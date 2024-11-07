import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { useSpeakerData } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { FancyLoader } from 'lib/components/loader/loader'
import { SpeakerLayout } from 'components/domain/app/dc7/speakers/index'
import { useRecoilState } from 'recoil'
import { speakerFilterAtom } from 'pages/_app'
import HeartIcon from 'assets/icons/heart.svg'
import HeartIconFill from 'assets/icons/dc-7/heart-fill.svg'
import cn from 'classnames'
import ShareIcon from 'assets/icons/arrow-curved.svg'

const FilterTrigger = () => {
  const [speakerFilter, setSpeakerFilter] = useRecoilState(speakerFilterAtom)

  return (
    <div data-type="speaker-filter-actions" className="flex flex-row gap-3 items-center text-2xl">
      {/* <FilterIcon
    className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
    style={{ '--color-icon': '#99A0AE' }}
  /> */}

      {/* <ShareIcon className="icon cursor-pointer font-xl" /> */}

      {speakerFilter.favorited && <div className="text-xs font-semibold line-clamp-2">Showing Favorites</div>}

      <div
        onClick={() => setSpeakerFilter({ ...speakerFilter, favorited: !speakerFilter.favorited })}
        className={cn(
          'flex shrink-0 relative items-center xl:w-[40px] xl:h-[40px] w-[38px] h-[38px] justify-center text-xl cursor-pointer rounded-full p-2.5 transition-all duration-300',
          speakerFilter.favorited && 'bg-[#6d3bff] fill-[#7D52F4]'
        )}
      >
        {speakerFilter.favorited ? (
          <HeartIconFill
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': 'white' }}
          />
        ) : (
          <HeartIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': 'white' }}
          />
        )}
      </div>
    </div>
  )
}

const SpeakersPage = (props: any) => {
  const speakers = useSpeakerData()

  return (
    <AppLayout pageTitle="Speakers" breadcrumbs={[{ label: 'Speakers' }]} renderActions={() => <FilterTrigger />}>
      <SEO title={'Speakers'} />

      <SpeakerLayout speakers={speakers} />

      <div className="fixed inset-0 h-[101vh] w-full flex justify-center items-center z-5 pointer-events-none">
        <FancyLoader loading={!speakers} />
      </div>
    </AppLayout>
  )
}

export default SpeakersPage

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
