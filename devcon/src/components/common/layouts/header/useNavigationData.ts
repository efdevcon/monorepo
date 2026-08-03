import { useTranslations } from 'next-intl'
import LogoAbout from 'assets/images/pages/about.svg'
import { HeartHandshake, MicVocal, Users, CirclePlay, History } from 'lucide-react'
import DevconGlyph from 'assets/icons/devcon-glyph.svg'
import Dc8Glyph from 'assets/icons/dc8-glyph-small.svg'

const useNavigationData = () => {
  const t = useTranslations('common.nav')

  return {
    top: [],
    site: [
      {
        title: t('about'),
        url: '#',
        type: 'links',
        logo: LogoAbout,
        links: [
          {
            title: t('devcon'),
            url: '#',
            type: 'header',
            icon: DevconGlyph,
          },
          {
            title: t('about'),
            url: '/about',
            type: 'page',
          },
          {
            title: t('faq'),
            url: '/tickets/faq',
            type: 'page',
          },
          {
            title: t('blog'),
            url: '/blogs',
            type: 'page',
          },
        ],
      },
      {
        title: t('attend'),
        url: '#',
        type: 'links',
        links: [
          {
            title: t('devcon_8_india'),
            url: '#',
            type: 'header',
            icon: Dc8Glyph,
          },
          {
            title: t('tickets'),
            url: '/tickets',
            type: 'page',
          },
          {
            title: t('travel_guide'),
            url: '/travel-guide',
            type: 'page',
          },
        ],
      },
      {
        title: t('participate'),
        url: '#',
        type: 'links',
        foldoutWidth: 464,
        links: [
          {
            title: t('speakers'),
            url: '#',
            type: 'header',
            icon: MicVocal,
          },
          {
            title: t('speak_at_devcon'),
            url: '/speaker-applications',
            type: 'page',
          },
          {
            title: t('contribute'),
            url: '#',
            type: 'header',
            icon: HeartHandshake,
            columns: 2,
          },
          // Row-major order for the 2-column desktop grid:
          // Volunteer | Road to Devcon / Community Hubs | Submit a DIP
          {
            title: t('volunteer_program'),
            url: '/form/volunteer',
            type: 'page',
          },
          {
            title: t('road_to_devcon'),
            url: '/road-to-devcon',
            type: 'page',
          },
          {
            title: t('community_hubs'),
            url: 'https://forum.devcon.org/t/rfp-13-devcon-8-india-community-hubs/8657',
            type: 'link',
          },
          {
            title: t('submit_dip'),
            url: 'https://forum.devcon.org/t/start-here-how-to-submit-your-proposal/7090',
            type: 'link',
          },
        ],
      },
      {
        title: t('community'),
        url: '#',
        type: 'links',
        links: [
          {
            title: t('community'),
            url: '#',
            type: 'header',
            icon: Users,
          },
          {
            title: t('dips'),
            url: '/dips',
            type: 'page',
          },
          {
            title: t('forum'),
            url: 'https://forum.devcon.org/',
            type: 'link',
          },
        ],
      },
      {
        title: t('archive'),
        url: '#',
        type: 'links',
        links: [
          {
            title: t('content'),
            url: '#',
            type: 'header',
            icon: CirclePlay,
          },
          {
            title: t('devcon_archive'),
            url: 'https://archive.devcon.org',
            type: 'link',
          },
          {
            title: t('history'),
            url: '#',
            type: 'header',
            icon: History,
          },
          {
            title: t('past_events'),
            url: '/past-events',
            type: 'page',
          },
          {
            title: t('devconnect'),
            url: 'https://devconnect.org',
            type: 'link',
          },
        ],
      },
      {
        title: t('view_tickets'),
        url: '/tickets',
        type: 'page',
        highlight: 'tickets',
      },
    ],
    footer: {
      bottom: [],
      left: [
        {
          title: t('about'),
          url: '/about',
          type: 'page',
        },
        {
          title: t('faq'),
          url: '/tickets/faq',
          type: 'page',
        },
        // {
        //   title: 'Program',
        //   url: '/programming',
        //   type: 'page',
        // },
        // {
        //   title: 'Tickets',
        //   url: '/tickets',
        //   type: 'page',
        // },
        // {
        //   title: 'City Guide',
        //   url: '/city-guide',
        //   type: 'page',
        // },
        // {
        //   title: 'Experiences',
        //   url: '/experiences',
        //   type: 'page',
        // },

        {
          title: t('blog'),
          url: '/blogs',
          type: 'page',
        },
        {
          title: t('past_events'),
          url: '/past-events',
          type: 'page',
        },
        {
          title: t('archive'),
          url: 'https://archive.devcon.org/archive/',
          type: 'link',
        },
      ],
      right: [
        {
          title: t('supporters'),
          url: '/supporters',
          type: 'page',
        },
        {
          title: t('volunteers'),
          url: '/form/volunteer',
          type: 'page',
        },
        {
          title: t('community_hubs'),
          url: 'https://forum.devcon.org/t/rfp-13-devcon-8-india-community-hubs/8657',
          type: 'link',
        },
        {
          title: t('media_press'),
          url: 'https://docs.google.com/forms/d/e/1FAIpQLSeTL0i6d1SKaZHC0IkobF4ZjM2It1_jefTQkG0jxdxsj-OBsQ/viewform?usp=dialog',
          type: 'link',
        },
        {
          title: t('press_kit'),
          // Fully qualified domains because intl middleware redirects fuck it up otherwise - easiest to handle it here
          url:
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000/Devcon__Devconnect_Presskit.pdf'
              : 'https://devcon.org/Devcon__Devconnect_Presskit.pdf',
          type: 'page',
        },
        {
          title: t('dips'),
          url: '/dips',
          type: 'page',
        },
      ],
      // rightBottom: [
      //   {
      //     title: intl('navigation_forum'),
      //     url: 'https://forum.devcon.org/',
      //     type: 'link',
      //   },
      //   {
      //     title: 'Github',
      //     url: 'https://github.com/efdevcon/',
      //     type: 'link',
      //   },
      // ],
    },
  }
}

export default useNavigationData
