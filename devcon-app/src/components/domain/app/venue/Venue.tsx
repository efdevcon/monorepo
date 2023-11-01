import React from 'react'
import { Link } from 'components/common/link'
import css from './venue.module.scss'
import { Room } from 'types/Room'
import { AppNav } from 'components/domain/app/navigation'
import { Search } from 'components/common/filter/Filter'
import filterCss from 'components/domain/app/app-filter.module.scss'
import Image from 'next/image'
import VenueMap from 'assets/images/venue-map/Venue.png'
import Panzoom, { PanZoom } from 'panzoom'
import IconPlus from 'assets/icons/plus.svg'
import IconMinus from 'assets/icons/minus.svg'
import ListIcon from 'assets/icons/list.svg'
import TileIcon from 'assets/icons/layers.svg'
import { getFloorImage } from './Floor'
import { defaultSlugify } from 'utils/formatting'
import { RoomList } from './roomlist'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import { useIsStandalone } from 'utils/pwa-link'
import imageAgora from './agora.png'
import { Button } from 'components/common/button'
import { useRouter } from 'next/router'
import IconInformation from 'assets/icons/info.svg'
import IconDirections from 'assets/icons/directions.svg'

interface Props {
  rooms: Array<Room>
  floors: Array<string>
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
  const router = useRouter()
  const isStandalone = useIsStandalone()
  const [openFloors, setOpenFloors] = React.useState({} as { [key: string]: boolean })
  const [listView, setListView] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filteredFloors = (
    search
      ? props.floors.filter(floor => {
          if (floor.toLowerCase().includes(search.toLowerCase())) return true

          const roomsByFloor = props.rooms.filter(i => i.info === floor)

          return roomsByFloor.some(
            room => room.name.toLowerCase().includes(search) || room.description.toLowerCase().includes(search)
          )
        })
      : props.floors
  ).sort((a, b) => b.localeCompare(a))
  const basement = filteredFloors.shift()
  if (basement) filteredFloors.push(basement)

  function onSearch(nextVal: any) {
    setSearch(nextVal)

    if (!nextVal) {
      setOpenFloors({})
    } else {
      filteredFloors.forEach(floor =>
        setOpenFloors(openFloors => {
          return {
            ...openFloors,
            [floor]: true,
          }
        })
      )
    }
  }

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Venue Map',
          },
        ]}
        renderRight={() => {
          return (
            <>
              <Link
                style={{ display: 'flex' }}
                to="https://www.google.com/maps/place/Agora+Bogot%C3%A1+Convention+Center/@4.6299916,-74.0945735,17z/data=!3m1!4b1!4m5!3m4!1s0x8e3f9bd91908ed1d:0x23880f62017a68ac!8m2!3d4.6299916!4d-74.0923848"
              >
                <IconDirections />
              </Link>

              <Link style={{ display: 'flex' }} to="/info#venue-guide">
                <IconInformation />
              </Link>
            </>
          )
        }}
      />

      {/* <div className={css['panzoom-cover']}>
        <div className={css['image']} id="image-container">
          <Image src={VenueMap} alt="venue map" layout="raw" />
        </div>
      </div> */}

      <div className={`${filterCss['filter']} border-top`}>
        <div className="section clear-bottom-less">
          <div className={css['filter']}>
            <Search className={css['search']} placeholder="Search venue" onChange={onSearch} value={search} />

            <div className={css['end']}>
              <button
                onClick={() => setListView(true)}
                className={`${listView ? 'hover' : ''} app squared sm thin-borders`}
              >
                <ListIcon />
              </button>
              <button
                onClick={() => setListView(false)}
                className={`${listView ? '' : 'hover'} app squared sm thin-borders`}
              >
                <TileIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section clear-top-less">
        {/* <h2 className="app-header clear-bottom-less">Floors</h2> */}

        <div className={`${css['agora']}`}>
          <div className={css['info']}>
            <p className="app-header">Agora Bogotá Convention Center</p>
            <Button className="red sm" onClick={() => router.push('/info#venue-guide')}>
              Info
            </Button>
          </div>
          <div className={css['image']}>
            <Image alt="Agora Bogotá Convention Center" objectFit="cover" src={imageAgora} />
          </div>
        </div>

        {listView &&
          filteredFloors.map(floor => {
            const roomsByFloor = props.rooms.filter(i => i.info === floor)

            return (
              <CollapsedSection
                key={floor}
                open={openFloors[floor]}
                setOpen={() => {
                  const isOpen = openFloors[floor]
                  const nextOpenState = {
                    ...openFloors,
                    [floor]: true,
                  }

                  if (isOpen) {
                    delete nextOpenState[floor]
                  }

                  setOpenFloors(nextOpenState)
                }}
              >
                <CollapsedSectionHeader>
                  <p className="app-header">{floor}</p>
                </CollapsedSectionHeader>
                <CollapsedSectionContent>
                  <div className="clear-top-less">
                    <RoomList rooms={roomsByFloor} />
                  </div>
                </CollapsedSectionContent>
              </CollapsedSection>
            )
          })}

        {!listView &&
          filteredFloors.map(floor => {
            return (
              <Link
                to={isStandalone ? `/venue?floor=${defaultSlugify(floor)}` : `/venue/floor/${defaultSlugify(floor)}`}
                className={`${css['list-item']} clear-top-less`}
                key={floor}
              >
                <div className={`padded bold app-header`}>{floor}</div>
                <div className={css['floor-image']}>{getFloorImage(floor, 'fill')}</div>
              </Link>
            )
          })}
      </div>
    </>
  )
}
