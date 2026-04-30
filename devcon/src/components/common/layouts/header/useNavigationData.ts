import { useTranslations } from 'next-intl'
import LogoProgram from 'assets/images/pages/program.svg'
import LogoAbout from 'assets/images/pages/about.svg'
import LogoBogota from 'assets/images/pages/bogota.svg'
import LogoTickets from 'assets/images/pages/tickets.svg'
import LogoGetInvolved from 'assets/images/pages/get-involved.svg'
import { HandHeart, Newspaper, CirclePlay, History } from 'lucide-react'
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
            title: t('blog'),
            url: '/blogs',
            type: 'page',
          },
        ],
      },
      {
        title: t('get_involved'),
        url: '#',
        type: 'links',
        logo: LogoGetInvolved,
        links: [
          {
            title: t('community'),
            url: '#',
            type: 'header',
            icon: HandHeart,
          },
          {
            title: t('ecosystem_program'),
            url: '/ecosystem-program',
            type: 'page',
          },
          {
            title: t('academic_program'),
            url: '/academic-program',
            type: 'page',
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
          {
            title: t('press'),
            url: '#',
            type: 'header',
            icon: Newspaper,
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
        {
          title: t('swarm_mirror'),
          url: 'https://devcon.swarm.eth.limo/',
          type: 'link',
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
