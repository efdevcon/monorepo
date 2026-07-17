import { useTranslations } from 'next-intl'
import LogoProgram from 'assets/images/pages/program.svg'
import LogoAbout from 'assets/images/pages/about.svg'
import LogoBogota from 'assets/images/pages/bogota.svg'
import LogoTickets from 'assets/images/pages/tickets.svg'
import { HeartHandshake, MicVocal, Users, Newspaper, CirclePlay, History } from 'lucide-react'
import DevconGlyph from 'assets/icons/devcon-glyph.svg'

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
        title: t('participate'),
        url: '#',
        type: 'links',
        links: [
          {
            title: t('contribute'),
            url: '#',
            type: 'header',
            icon: HeartHandshake,
          },
          {
            title: t('volunteer_program'),
            url: '/form/volunteer',
            type: 'page',
          },
          {
            title: t('supporters_program'),
            url: '/supporters',
            type: 'page',
          },
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
            title: t('media'),
            url: '#',
            type: 'header',
            icon: Newspaper,
            newColumn: true,
          },
          {
            title: t('media_press'),
            url: 'https://docs.google.com/forms/d/e/1FAIpQLSeTL0i6d1SKaZHC0IkobF4ZjM2It1_jefTQkG0jxdxsj-OBsQ/viewform?usp=dialog',
            type: 'link',
          },
          {
            title: t('press_kit'),
            url:
              process.env.NODE_ENV === 'development'
                ? 'http://localhost:3000/Devcon__Devconnect_Presskit.pdf'
                : 'https://devcon.org/Devcon__Devconnect_Presskit.pdf',
            type: 'page',
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
            title: t('forum'),
            url: 'https://forum.devcon.org/',
            type: 'link',
          },
          {
            title: t('dips'),
            url: '/dips',
            type: 'page',
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

        // {
        //   title: 'Apply To Speak',
        //   url: '/speaker-applications',
        //   type: 'page',
        // },
        // {
        //   title: 'Volunteer',
        //   url: 'https://forms.gle/yKnLpNzkchjX8nqbA',
        //   type: 'url',
        // },
        // {
        //   title: 'FAQ',
        //   url: '/faq',
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
        // {
        //   title: 'RTD',
        //   url: '/road-to-devcon#events',
        //   type: 'page',
        // },
        // {
        //   title: 'Devcon Week',
        //   url: '/devcon-week',
        //   type: 'page',
        // },
        // {
        //   title: 'Supporters',
        //   url: '/supporters',
        //   type: 'page',
        // },
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
        {
          title: t('github'),
          url: 'https://github.com/efdevcon/',
          type: 'link',
        },
        {
          title: t('devconnect'),
          url: 'https://devconnect.org',
          type: 'link',
        },
        // {
        //   title: 'Press & Media',
        //   url: 'https://forms.gle/5VmWvgb3ZaGamUXL7',
        //   type: 'link',
        // },
        {
          title: t('press_kit'),
          // Fully qualified domains because intl middleware redirects fuck it up otherwise - easiest to handle it here
          url:
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000/Devcon__Devconnect_Presskit.pdf'
              : 'https://devcon.org/Devcon__Devconnect_Presskit.pdf',
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
