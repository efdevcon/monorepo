import React from 'react'
import Image from 'next/image'
import css from './floor.module.scss'
import venueCss from './venue.module.scss'
import filterCss from 'components/domain/app/app-filter.module.scss'

import FloorBasement from 'assets/images/venue-map/FloorBasement.png'
import Floor1 from 'assets/images/venue-map/Floor1.png'
import Floor2 from 'assets/images/venue-map/Floor2.png'
import Floor3 from 'assets/images/venue-map/Floor3.png'
import Floor4 from 'assets/images/venue-map/Floor4.png'
import Floor5 from 'assets/images/venue-map/Floor5.png'
import ArrowLeft from 'assets/icons/chevron_left.svg'
import ArrowRight from 'assets/icons/chevron_right.svg'
import { AppNav } from '../navigation'
import { PanzoomControls, usePanzoom } from './Venue'
import { Search } from 'components/common/filter/Filter'
import { RoomList } from './roomlist'
import { Room } from 'types/Room'
import { useRouter } from 'next/router'
import { useIsStandalone } from 'utils/pwa-link'

interface Props {
  floor: string
  rooms: Room[]
}

declare const VALID_LAYOUT_VALUES: readonly ['fill', 'fixed', 'intrinsic', 'responsive', 'raw', undefined]
declare type LayoutValue = typeof VALID_LAYOUT_VALUES[number]

export const getFloorImage = (floor: string, layout: LayoutValue = 'raw', className = '') => {
  if (floor === 'Floor 1')
    return <Image src={Floor1} className={className} alt={floor} layout={layout} id="venue-image" priority />
  if (floor === 'Floor 2')
    return <Image src={Floor2} className={className} alt={floor} layout={layout} id="venue-image" priority />
  if (floor === 'Floor 3')
    return <Image src={Floor3} className={className} alt={floor} layout={layout} id="venue-image" priority />
  if (floor === 'Floor 4')
    return <Image src={Floor4} className={className} alt={floor} layout={layout} id="venue-image" priority />
  if (floor === 'Floor 5')
    return <Image src={Floor5} className={className} alt={floor} layout={layout} id="venue-image" priority />
  if (floor === 'S1')
    return <Image src={FloorBasement} className={className} alt={floor} layout={layout} id="venue-image" priority />
}

export const Floor = (props: Props) => {
  const [search, setSearch] = React.useState('')
  const pz = usePanzoom()

  const filteredRooms = search
    ? props.rooms.filter(
        room => room.name.toLowerCase().includes(search) || room.description.toLowerCase().includes(search)
      )
    : props.rooms

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: props.floor,
          },
        ]}
      />

      <div className={venueCss['panzoom']}>
        <FloorNavigator current={props.floor} />
        <div className={venueCss['image']} id="image-container">
          {getFloorImage(props.floor)}
        </div>
        <PanzoomControls pz={pz} />
      </div>

      <div className={`${filterCss['filter']} border-top`}>
        <div className="section clear-bottom-less">
          <Search placeholder="Search rooms" onChange={setSearch} value={search} />
        </div>
      </div>

      <div className="section padding-top-less">
        <div className={css['background']}></div>

        <div className={css['room-info']}>
          <p className="h2 clear-bottom-less">{props.floor}</p>
        </div>

        <RoomList rooms={filteredRooms} />
      </div>
    </>
  )
}

interface NavigatorProps {
  current: string
}

export function FloorNavigator(props: NavigatorProps) {
  const router = useRouter()
  const isStandalone = useIsStandalone()

  function navigateFloor(action: 'prev' | 'next') {
    const floor = Number(props.current.charAt(props.current.length - 1))

    if (action === 'next') {
      if (props.current === 'S1') router.push(isStandalone ? `/venue?floor=floor-1` : `/venue/floor/floor-1`)
      else if (props.current === 'Floor 5') router.push(isStandalone ? `/venue?floor=s1` : `/venue/floor/s1`)
      else router.push(isStandalone ? `/venue?floor=floor-${floor + 1}` : `/venue/floor/floor-${floor + 1}`)
    }

    if (action === 'prev') {
      if (props.current === 'S1') router.push(isStandalone ? `/venue?floor=floor-5` : `/venue/floor/floor-5`)
      else if (props.current === 'Floor 1') router.push(isStandalone ? `/venue?floor=s1` : `/venue/floor/s1`)
      else router.push(isStandalone ? `/venue?floor=floor-${floor - 1}` : `/venue/floor/floor-${floor - 1}`)
    }
  }

  return (
    <div className={`${css['navigator']} section`}>
      <div className={css['shift-end']}>
        <button className={`${css['content']} app squared sm thin-borders`} onClick={() => navigateFloor('prev')}>
          <ArrowLeft />
        </button>
        <button className={`${css['content']} app squared sm thin-borders`} onClick={() => navigateFloor('next')}>
          <ArrowRight />
        </button>
      </div>
    </div>
  )
}
