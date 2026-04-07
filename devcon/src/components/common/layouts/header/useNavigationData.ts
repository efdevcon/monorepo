import { useTranslations } from 'next-intl'
import LogoProgram from 'assets/images/pages/program.svg'
import LogoAbout from 'assets/images/pages/about.svg'
import LogoBogota from 'assets/images/pages/bogota.svg'
import LogoTickets from 'assets/images/pages/tickets.svg'
import LogoGetInvolved from 'assets/images/pages/get-involved.svg'
import { devIndicatorServerState } from 'next/dist/server/dev/dev-indicator-server-state'
import { HandHeart, Newspaper, CirclePlay, History } from 'lucide-react'
import DevconGlyph from 'assets/icons/devcon-glyph.svg'
// import { useRecoilState, useSetRecoilState } from 'recoil'
// import { appState as appStateAtom } from 'state/main'

const useNavigationData = () => {
  // const intl = useTranslations()
  // const [appState, setAppState] = useRecoilState(appStateAtom)

  return {
    top: [
      // {
      //   title: intl('navigation_archive'),
      //   url: 'https://archive.devcon.org/archive/',
      //   type: 'link',
      // },
      // {
      //   title: intl('navigation_forum'),
      //   url: 'https://forum.devcon.org/',
      //   type: 'link',
      // },
      // {
      //   title: intl('navigation_blog'),
      //   url: '/blogs',
      //   type: 'page',
      // },
    ],
    site: [
      {
        title: 'About',
        url: '#',
        type: 'links',
        logo: LogoAbout,
        links: [
          {
            title: 'Devcon',
            url: '#',
            type: 'header',
            icon: DevconGlyph,
          },
          {
            title: 'About',
            url: '/about',
            type: 'page',
          },
          {
            title: 'Blog',
            url: '/blogs',
            type: 'page',
          },
        ],
      },
      {
        title: 'Get Involved',
        url: '#',
        type: 'links',
        logo: LogoGetInvolved,
        links: [
          {
            title: 'Community',
            url: '#',
            type: 'header',
            icon: HandHeart,
          },
          {
            title: 'Ecosystem Program',
            url: '/ecosystem-program',
            type: 'page',
          },
          {
            title: 'DIPs',
            url: '/dips',
            type: 'page',
          },
          {
            title: 'Forum',
            url: 'https://forum.devcon.org/',
            type: 'link',
          },
          {
            title: 'Press',
            url: '#',
            type: 'header',
            icon: Newspaper,
          },
          {
            title: 'Press Kit',
            url:
              process.env.NODE_ENV === 'development'
                ? 'http://localhost:3000/Devcon__Devconnect_Presskit.pdf'
                : 'https://devcon.org/Devcon__Devconnect_Presskit.pdf',
            type: 'page',
          },
        ],
      },
      {
        title: 'Archive',
        url: '#',
        type: 'links',
        links: [
          {
            title: 'Content',
            url: '#',
            type: 'header',
            icon: CirclePlay,
          },
          {
            title: 'Devcon Archive',
            url: 'https://archive.devcon.org',
            type: 'link',
          },
          {
            title: 'History',
            url: '#',
            type: 'header',
            icon: History,
          },
          {
            title: 'Past Events',
            url: '/past-events',
            type: 'page',
          },
          {
            title: 'Devconnect',
            url: 'https://devconnect.org',
            type: 'link',
          },
        ],
      },
      {
        title: 'View Tickets',
        url: '/tickets',
        type: 'page',
        highlight: 'tickets',
      },
    ],
    footer: {
      bottom: [
        // {
        //   title: intl('navigation_news'),
        //   url: '/news',
        //   type: 'page',
        // },
      ],
      // highlights: [
      //   {
      //     title: 'FAQ',
      //     url: '/faq',
      //     type: 'page',
      //   },
      // ],
      left: [
        {
          title: 'About',
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
          title: 'Blog',
          url: '/blogs',
          type: 'page',
        },
        {
          title: 'Past Events',
          url: '/past-events',
          type: 'page',
        },
        // {
        //   title: 'News',
        //   url: '/news',
        //   type: 'page',
        // },
        {
          title: 'Archive',
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
          title: 'DIPs',
          url: '/dips',
          type: 'page',
        },
        // {
        //   title: 'RTD Grants',
        //   url: 'https://esp.ethereum.foundation/devcon-grants',
        //   type: 'link',
        // },
        {
          title: 'Forum',
          url: 'https://forum.devcon.org/',
          type: 'link',
        },
        {
          title: 'Github',
          url: 'https://github.com/efdevcon/',
          type: 'link',
        },
        {
          title: 'Devconnect',
          url: 'https://devconnect.org',
          type: 'link',
        },
        // {
        //   title: 'Press & Media',
        //   url: 'https://forms.gle/5VmWvgb3ZaGamUXL7',
        //   type: 'link',
        // },
        {
          title: 'Press Kit',
          url:
            // Fully qualified domains because intl middleware redirects fuck it up otherwise - easiest to handle it here
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000/Devcon__Devconnect_Presskit.pdf'
              : 'https://devcon.org/Devcon__Devconnect_Presskit.pdf',
          type: 'page',
        },
        {
          title: 'Swarm Mirror',
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
