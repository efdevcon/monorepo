import { useTranslations } from 'next-intl'
import LogoAbout from 'assets/images/pages/about.svg'
import { Users, CirclePlay, History } from 'lucide-react'
import DevconGlyph from 'assets/icons/devcon-glyph.svg'
import { EVENT_APP_ORIGIN } from 'config/eventApp'
import type { Link as LinkType } from 'types/Link'

const useNavigationData = () => {
  const t = useTranslations('common.nav')
  // Post-event state: no ticket CTA pill in the header or the mobile menu.

  // Typed explicitly so consumers (Navigation's foldoutWidth read) don't
  // depend on which optional fields the current entries happen to set.
  const site: LinkType[] = [
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
        // Post-event: the Attend dropdown is gone, so its schedule (still
        // the Devcon app — external, hence the arrow-up-right indicator)
        // and travel guide live here now; Blog closes the list.
        {
          title: t('schedule'),
          url: `${EVENT_APP_ORIGIN}/schedule`,
          type: 'link',
        },
        {
          title: t('travel_guide'),
          url: '/travel-guide',
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
        // Post-event: Participate is gone; Road to Devcon leads Community.
        {
          title: t('road_to_devcon'),
          url: '/road-to-devcon',
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
  ]

  return {
    top: [],
    site,
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
        // Volunteer applications closed — link hidden until next cycle
        // {
        //   title: t('volunteers'),
        //   url: '/form/volunteer',
        //   type: 'page',
        // },
        {
          title: t('community_hubs'),
          url: 'https://forum.devcon.org/t/announcing-the-devcon-8-india-community-hubs/9191',
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
