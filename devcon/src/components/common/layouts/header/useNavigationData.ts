import { useTranslations } from 'next-intl'
import LogoProgram from 'assets/images/pages/program.svg'
import LogoAbout from 'assets/images/pages/about.svg'
import LogoBogota from 'assets/images/pages/bogota.svg'
import LogoTickets from 'assets/images/pages/tickets.svg'
import LogoGetInvolved from 'assets/images/pages/get-involved.svg'

const useNavigationData = () => {
  const intl = useTranslations()

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
        title: intl('navigation_about'),
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
            title: intl('navigation_about_devcon'),
            url: '/about',
            type: 'page',
          },
          {
            title: intl('navigation_past_events'),
            url: '/past-events',
            type: 'page',
          },
          {
            title: intl('navigation_updates'),
            url: '#',
            type: 'header',
          },
          {
            title: intl('news'),
            url: '/news',
            type: 'page',
          },
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
        title: intl('navigation_get_involved'),
        url: '#',
        type: 'links',
        logo: LogoGetInvolved,
        links: [
          {
            title: intl('navigation_community'),
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
          {
            title: 'RTD Grants',
            url: 'https://esp.ethereum.foundation/devcon-grants',
            type: 'link',
          },
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
          {
            title: intl('navigation_contribute'),
            url: '#',
            type: 'header',
          },
          {
            title: intl('navigation_forum'),
            url: 'https://forum.devcon.org/',
            type: 'link',
          },
          {
            title: 'Github',
            url: 'https://github.com/efdevcon/',
            type: 'link',
          },
        ],
      },
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
      {
        title: intl('navigation_forum'),
        url: 'https://forum.devcon.org/',
        type: 'link',
      },
      {
        title: intl('navigation_blog'),
        url: '/blogs',
        type: 'page',
      },
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
      {
        title: 'Devconnect',
        url: 'https://devconnect.org',
        type: 'link',
      },
      {
        title: intl('navigation_archive'),
        url: 'https://archive.devcon.org',
        type: 'page',
        highlight: 'archive',
      },

    ],
    footer: {
      bottom: [
        {
          title: intl('navigation_news'),
          url: '/news',
          type: 'page',
        },
      ],
      highlights: [
        {
          title: intl('navigation_faq'),
          url: '/faq',
          type: 'page',
        },
      ],
      left: [
        {
          title: 'DIPs',
          url: '/dips',
          type: 'page',
        },
      ],
      right: [
        {
          title: intl('navigation_about'),
          url: '/about',
          type: 'page',
        },
        {
          title: intl('navigation_forum'),
          url: 'https://forum.devcon.org/',
          type: 'link',
        },
        {
          title: intl('navigation_blog'),
          url: '/blogs',
          type: 'page',
        },
        {
          title: 'Devconnect',
          url: 'https://devconnect.org',
          type: 'link',
        },
        {
          title: intl('navigation_archive'),
          url: 'https://archive.devcon.org/archive/',
          type: 'link',
        },

        // {
        //   title: intl('navigation_tickets'),
        //   url: '/tickets',
        //   type: 'page',
        // },
        // {
        //   title: intl('navigation_program'),
        //   url: '/program',
        //   type: 'page',
        // },
        // {
        //   title: 'DIPs',
        //   url: '/dips',
        //   type: 'page',
        // },
        // {
        //   title: intl('navigation_city_guide'),
        //   url: '/bogota',
        //   type: 'page',
        // },
        // {
        //   title: 'FAQ',
        //   url: '/faq',
        //   type: 'page',
        // },
      ],
    },
  }
}

export default useNavigationData
