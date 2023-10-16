import React from 'react'
import { CSS3D } from './css-3d'
import { AppSearch } from 'components/domain/app/app-search'
import { useSort, SortVariation, Sort } from 'components/common/sort'
import { LinkList, Link } from 'components/common/link'
import css from './venue.module.scss'
import ListIcon from 'assets/icons/list.svg'
import LayersIcon from 'assets/icons/layers.svg'
import { NoResults } from 'components/common/filter'
import { Room } from 'types/Room'
import { AppNav } from 'components/domain/app/navigation'
import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import filterCss from 'components/domain/app/app-filter.module.scss'
import Image from 'next/legacy/image'
import Floor from 'assets/images/venue-map/venue-map.png'
import Panzoom, { PanZoom, PanZoomController } from 'panzoom'
import IconPlus from 'assets/icons/plus.svg'
import IconMinus from 'assets/icons/minus.svg'

interface Props {
  rooms: Array<Room>
  floors: Array<string>
}

type ButtonOverlayProps = {
  children?: React.ReactChild
  onClick: () => void
  text?: string
}

export const PanzoomControls = (props: { pz: PanZoom | null }) => {
  const onClick = (e: any) => {
    e.nativeEvent.preventDefault()

    const scene = document.getElementById('image-container')

    if (!scene || !props.pz) return

    const rect = scene.getBoundingClientRect()
    // const cx = rect.x + rect.width / 2
    // const cy = rect.y + rect.height / 2
    const cx = scene.offsetLeft + rect.width / 2
    const cy = scene.offsetTop + rect.height / 2
    const isZoomIn = e.currentTarget.id === 'zoomIn'
    const zoomBy = isZoomIn ? 2 : 0.5
    props.pz.smoothZoom(cx, cy, zoomBy)
  }

  return (
    <div className={`${css['container']} section`}>
      <div className={css['shift-end']}>
        <div id="zoomIn" onClick={onClick} className={css['content']}>
          <IconPlus />
        </div>
        <div id="zoomOut" onClick={onClick} className={css['content']}>
          <IconMinus />
        </div>
      </div>
    </div>
  )
}

export const usePanzoom = () => {
  const [panzoomInstance, setPanzoomInstance] = React.useState<PanZoom | null>(null)

  React.useEffect(() => {
    const scene = document.getElementById('venue-image')

    if (scene) {
      const panzoomInstance = Panzoom(scene, {
        bounds: true,
        // boundsPadding: 0.8,
        // maxZoom: 1,
        minZoom: 0.5,
        beforeWheel: function (e) {
          // allow wheel-zoom only if altKey is down. Otherwise - ignore
          var shouldIgnore = !e.ctrlKey
          return shouldIgnore
        },
      })

      setPanzoomInstance(panzoomInstance)

      return () => {
        setPanzoomInstance(null)
        panzoomInstance.dispose()
      }
    }
  }, [])

  return panzoomInstance
}

export const Venue = (props: Props) => {
  // const [listView, setListView] = React.useState()
  const [search, setSearch] = React.useState('')
  const pz = usePanzoom()

  const filteredFloors = search
    ? props.floors.filter(floor => {
        if (search.toLowerCase().includes(floor.toLowerCase())) return true

        const roomsByFloor = props.rooms.filter(i => i.info === floor)

        return roomsByFloor.some(room => room.name.toLowerCase().includes(search))
      })
    : props.floors

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Venue Map',
          },
        ]}
      />

      {/* <CSS3D /> */}

      <div className={css['panzoom']}>
        <div className={css['image']} id="image-container">
          <Image src={Floor} alt="venue map" id="venue-image" priority />
        </div>
        <PanzoomControls pz={pz} />
      </div>

      <div className={`${filterCss['filter']} border-top`}>
        <div className="section clear-bottom-less">
          <Search placeholder="Search venue" onChange={setSearch} value={search} />
        </div>
      </div>

      <div className="section clear-top-less">
        <h2 className="app-header clear-bottom-less">Floors</h2>
        {filteredFloors.sort().map(floor => {
          const roomsByFloor = props.rooms.filter(i => i.info === floor)

          return (
            <div className="clear-top-less" key={floor}>
              <div className={`padded bold app-header ${css['floor-header']}`}>{floor}</div>
              <LinkList>
                {roomsByFloor.map((room: Room) => {
                  return (
                    <Link className={`font-md ${css['floor-link']}`} key={room.id} to={`/app/venue/${room.id}`}>
                      {room.name}
                    </Link>
                  )
                })}
              </LinkList>
            </div>
          )
        })}
      </div>
    </>
  )
}
