import { useTranslations } from 'next-intl'
import LogoProgram from 'assets/images/pages/program.svg'
import LogoAbout from 'assets/images/pages/about.svg'
import LogoBogota from 'assets/images/pages/bogota.svg'
import LogoTickets from 'assets/images/pages/tickets.svg'
import LogoGetInvolved from 'assets/images/pages/get-involved.svg'
import { useRecoilState, useSetRecoilState } from 'recoil'
import { appState as appStateAtom } from 'state/main'

const useNavigationData = () => {
  // const intl = useTranslations()
  const [appState, setAppState] = useRecoilState(appStateAtom)

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
        title: 'About Devcon',
        url: '#',
        type: 'links',
        logo: LogoAbout,
        links: [
          {
            title: 'Devcon',
            url: '#',
            type: 'header',
          },
          {
            title: 'About',
            url: '/about',
            type: 'page',
          },
          {
            title: 'Past Events',
            url: '/past-events',
            type: 'page',
          },
          {
            title: 'FAQ',
            url: '/faq',
            type: 'page',
          },
          {
            title: 'Forum',
            url: 'https://forum.devcon.org/',
            type: 'link',
          },
          {
            title: 'Updates',
            url: '#',
            type: 'header',
          },
          {
            title: 'Blog',
            url: '/blogs',
            type: 'page',
          },
          // {
          //   title: intl('news'),
          //   url: '/news',
          //   type: 'page',
          // },
          // {
          //   title: intl('navigation_faq'),
          //   url: '/faq',
          //   type: 'page',
          // },
          // {
          //   title: intl('navigation_tickets'),
          //   url: '#',
          //   type: 'header',
          // },
          // {
          //   title: intl('navigation_get_tickets'),
          //   url: '/tickets',
          //   type: 'page',
          // },
          // {
          //   title: intl('navigation_tickets_raffle'),
          //   url: '/raffle-auction',
          //   type: 'page',
          // },
          // {
          //   title: intl('navigation_program'),
          //   url: '#',
          //   type: 'header',
          // },
          // {
          //   title: intl('navigation_program_overview'),
          //   url: '/program',
          //   type: 'page',
          // },
          // {
          //   title: intl('navigation_program_apply_to_speak'),
          //   url: '/applications',
          //   type: 'page',
          // },
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
          },
          {
            title: 'Road to Devcon',
            url: '/road-to-devcon',
            type: 'page',
          },
          {
            title: 'DIPs',
            url: '/dips',
            type: 'page',
          },
          // {
          //   title: 'Supporters & Impact Teams',
          //   url: '/supporters',
          //   type: 'page',
          // },
          // {
          //   title: 'Apply To Volunteer',
          //   url: 'https://forms.gle/yKnLpNzkchjX8nqbA',
          //   type: 'url',
          // },
          // {
          //   title: 'Apply to Speak',
          //   url: '/speaker-applications',
          //   type: 'page',
          // },
          // {
          //   title: 'RTD Grants',
          //   url: 'https://esp.ethereum.foundation/devcon-grants',
          //   type: 'link',
          // },
          // {
          //   title: intl('navigation_supporters'),
          //   url: '/supporters',
          //   type: 'page',
          // },
          // {
          //   title: intl('navigation_participate'),
          //   url: '#',
          //   type: 'header',
          // },
          // {
          //   title: intl('navigation_press'),
          //   url: 'https://forms.gle/G4FxcQsC2Byy9NEHA',
          //   type: 'link',
          // },
          // {
          //   title: intl('navigation_volunteer'),
          //   url: 'https://forms.gle/GnH3SyxSNnQCCn8TA',
          //   type: 'link',
          // },
          // {
          //   title: intl('navigation_contribute'),
          //   url: '#',
          //   type: 'header',
          // },
          // {
          //   title: intl('navigation_forum'),
          //   url: 'https://forum.devcon.org/',
          //   type: 'link',
          // },
          // {
          //   title: 'Github',
          //   url: 'https://github.com/efdevcon/',
          //   type: 'link',
          // },
          {
            title: 'Press',
            url: '#',
            type: 'header',
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
        ],
      },
      // {
      //   title: 'Event',
      //   url: '#',
      //   type: 'links',
      //   logo: LogoGetInvolved,
      //   links: [
      //     {
      //       title: 'Event',
      //       url: '#',
      //       type: 'header',
      //     },
      //     {
      //       title: 'Program Overview',
      //       url: '/programming',
      //       type: 'page',
      //     },
      //     {
      //       title: 'Experiences',
      //       url: '/experiences',
      //       type: 'page',
      //     },
      //     {
      //       title: 'Tickets',
      //       url: '/tickets',
      //       type: 'page',
      //     },
      //     {
      //       title: 'City Guide',
      //       url: '/city-guide',
      //       type: 'page',
      //     },
      //     {
      //       title: 'Devcon Week',
      //       url: '/devcon-week',
      //       type: 'page',
      //     },
      //   ],
      // },
      // {
      //   title: 'Program',
      //   url: '/programming',
      //   type: 'page',
      // },

      // {
      //   title: intl('navigation_event'),
      //   url: '#',
      //   type: 'links',
      //   logo: LogoBogota,
      //   links: [
      //     {
      //       title: 'Bogotá',
      //       url: '#',
      //       type: 'header',
      //     },
      //     {
      //       title: intl('navigation_city_guide'),
      //       url: '/bogota',
      //       type: 'page',
      //     },
      //     {
      //       title: intl('devcon_week_title'),
      //       url: '/devcon-week',
      //       type: 'page',
      //     },
      //     {
      //       title: 'Devcon',
      //       url: '#',
      //       type: 'header',
      //     },
      //     {
      //       title: intl('cd_title'),
      //       url: '/continuous-devcon',
      //       type: 'page',
      //     },
      //     {
      //       title: 'Devcon Satellites',
      //       url: '/satellites',
      //       type: 'page',
      //     },
      //   ],
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
      // Comment these back in when closer to the event ;)
      // {
      //   title: intl('navigation_live'),
      //   url: 'https://live.devcon.org',
      //   type: 'page',
      //   highlight: 'livestream',
      // },
      // {
      //   title: intl('navigation_devcon_app'),
      //   url: 'https://app.devcon.org',
      //   type: 'page',
      //   highlight: 'app',
      // },
      // {
      //   title: 'Devconnect',
      //   url: 'https://devconnect.org',
      //   type: 'link',
      // },
      {
        title: 'Archive',
        url: 'https://archive.devcon.org',
        type: 'page',
        // highlight: 'archive',
      },
      {
        title: 'Devconnect 2025',
        url: 'https://devconnect.org',
        type: 'link',
      },
      // {
      //   title: 'DevAI 🦄',
      //   type: 'button',
      //   onClick: () => {
      //     setAppState({ ...appState, devabotVisible: !appState.devabotVisible })
      //   },
      // },
      {
        title: 'Devcon App',
        url: 'https://app.devcon.org',
        type: 'page',
        highlight: 'app',
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
      highlights: [
        {
          title: 'FAQ',
          url: '/faq',
          type: 'page',
        },
      ],
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
        {
          title: 'FAQ',
          url: '/faq',
          type: 'page',
        },
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
        {
          title: 'RTD',
          url: '/road-to-devcon#events',
          type: 'page',
        },
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
