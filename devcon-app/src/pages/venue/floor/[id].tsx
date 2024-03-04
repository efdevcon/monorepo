import { AppLayout } from 'components/domain/app/Layout'
import { Floor } from 'components/domain/app/venue/Floor'
import { SEO } from 'components/domain/seo'
import { pageHOC } from 'context/pageHOC'
import { GetStaticPaths, GetStaticProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import { getGlobalData } from 'services/global'
import { fetchFloors, fetchRooms } from 'services/event-data'
import { Room } from 'types/Room'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { defaultSlugify } from 'utils/formatting'

interface Props {
  floors: string[]
  floor: string
  rooms: Room[]
}

interface Params extends ParsedUrlQuery {
  id: string
}

export default pageHOC(({ sessions, ...props }: any) => {
  return (
    <AppLayout>
      <SEO title={props.floor} />
      <Floor floor={props.floor} rooms={props.rooms} />
    </AppLayout>
  )
})

export const getStaticPaths: GetStaticPaths = async () => {
  const floors = await fetchFloors()

  return {
    paths: floors.map(i => ({ params: { id: defaultSlugify(i) } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<Props, Params> = async context => {
  const rooms = await fetchRooms()
  const floors = await fetchFloors()
  const floor = floors.find(i => defaultSlugify(i) === context.params?.id)
  if (!floor) return { props: null, notFound: true }

  const roomsByFloor = rooms.filter(i => i.info === floor)

  return {
    props: {
      ...(await getGlobalData(context.locale, true)),
      page: DEFAULT_APP_PAGE,
      floors,
      floor,
      rooms: roomsByFloor,
    },
  }
}
