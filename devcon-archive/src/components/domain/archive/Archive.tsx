import React from 'react'
import { Header } from 'src/components/common/layouts/header'
import { Footer } from 'src/components/common/layouts/footer'
import { SEO } from 'src/components/domain/seo'
import css from './archive.module.scss'
import { PageHero } from 'src/components/common/page-hero'
import { CuratedPlaylists, Playlists, StaffPicks } from './playlists'
import { Editions } from './Editions'
import { usePlaylists } from 'src/hooks/usePlaylists'
import { useStaffPicks } from 'src/hooks/useStaffPicks'
import { Interests } from './interests'
import OnDemandVideoIcon from 'src/assets/icons/on_demand_video.svg'
import { Button } from 'src/components/common/button'
import { ARCHIVE_DESCRIPTION, ARCHIVE_IMAGE_URL, ARCHIVE_TITLE } from 'src/utils/constants'
// import LibButton from 'lib/components/button'

type ArchiveProps = {}

export const Archive = (props: ArchiveProps) => {
  const playlists = usePlaylists()
  const staffpicks = useStaffPicks()
  const curated = playlists.filter(i => i.categories.includes('Community Curated'))

  return (
    <div className={css['container']}>
      {/* <LibButton /> */}
      <SEO title={ARCHIVE_TITLE} description={ARCHIVE_DESCRIPTION} imageUrl={ARCHIVE_IMAGE_URL} />
      <Header withStrip={false} />
      <PageHero
        scenes={staffpicks.videos.map(video => {
          return {
            image:
              video.image ||
              video.imageUrl ||
              `https://img.youtube.com/vi/${video.youtubeUrl.split('/').pop()}/maxresdefault.jpg`,
            imageProps: {
              alt: 'Staff pick',
            },
            callToAction: () => {
              const slug = `${video.slug}?playlist=${encodeURIComponent(staffpicks.title)}`

              return (
                <Button to={slug} className={`red ${css['call-to-action']}`}>
                  <span className={css['watch-now']}>Watch Now</span>

                  <OnDemandVideoIcon className={`icon ${css['watch-now-icon']}`} />
                </Button>
              )
            },
            content: () => {
              return (
                <div className={css['page-hero-scene']}>
                  <div className={css['body']}>
                    <div className="label bold">Staff Pick</div>
                    <p className="font-xl bold">{video.title}</p>
                    <p className={`${css['description']} font-lg`}>{video.description}</p>
                  </div>

                  <div className={css['metadata']}>
                    {video.speakers.length > 0 && (
                      <p>
                        By <span className="bold">{video.speakers.join(', ')}</span>
                      </p>
                    )}
                    <p className="bold">Devcon {video.edition}</p>
                  </div>
                </div>
              )
            },
          }
        })}
        title="Archive"
        titleClassName={css['white-title']}
        // titleSubtext="Devcon"
      />

      <div className={css['content']}>
        <Interests />

        <StaffPicks />

        <Playlists />

        <Editions />

        <CuratedPlaylists title="Curated Playlists" items={curated} viewMore />

        <Footer />
      </div>
    </div>
  )
}
