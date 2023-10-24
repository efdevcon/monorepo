import React from 'react'
import { Header } from 'src/components/common/layouts/header'
import { Footer } from 'src/components/common/layouts/footer'
import { SEO } from 'src/components/domain/seo'
import css from './playlists.module.scss'
import { PageHero } from 'src/components/common/page-hero'
import { usePlaylists } from 'src/hooks/usePlaylists'
import { CuratedPlaylists } from '../archive/playlists'
import { ARCHIVE_DESCRIPTION, ARCHIVE_IMAGE_URL, ARCHIVE_TITLE } from 'src/utils/constants'

export const Playlists = () => {
  const playlists = usePlaylists().filter(i => i.id !== 'most-popular')
  const categories = [...new Set(playlists.map(i => i.categories).flat())]

  return (
    <div className={css['container']}>
      <SEO title={ARCHIVE_TITLE} description={ARCHIVE_DESCRIPTION} imageUrl={ARCHIVE_IMAGE_URL} />
      <Header withStrip={false} />

      <PageHero
        title="Playlists"
        // titleSubtext="Devcon"
        description="Devcon collections to help you dive deep into specific topic areas."
      />

      {categories.map((category, i) => {
        const first = i === 0

        let className = 'padding-bottom'

        if (first) className = 'padding-bottom'

        let playlist = playlists.filter(i => i.categories.includes(category))

        if (category === 'Devcon') {
          playlist.sort((a, b) => (a.title > b.title ? -1 : 1))
        }

        return (
          <div key={category} className={className}>
            <CuratedPlaylists borderless={first} title={category} items={playlist} />
          </div>
        )
      })}

      <Footer />
    </div>
  )
}
