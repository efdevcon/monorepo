import { defineConfig, Template, RichTextType } from 'tinacms'
import faq from './templates/faq'
import road from './templates/road'
import past_events from './templates/past_events'
import dips from './templates/dips'
import index from './templates/index'
import supporters from './templates/supporters'
import programming from './templates/programming'
import tickets from './templates/tickets'
import about from './templates/about'
import city_guide from './templates/city_guide'
import { createRichText } from './presets'
import speaker_applications from './templates/speaker_applications'

export const filenameToUrl = {
  index: '/',
  dips: '/dips',
  past_events: '/past-events',
  road_to_devcon: '/road-to-devcon',
  faq: '/',
  programming: '/programming',
  tickets: '/tickets',
  about: '/about',
  supporters: '/supporters',
  speaker_applications: '/speaker-applications',
  city_guide: '/city-guide',
}

// Your hosting provider likely exposes this as an environment variable
const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main'

export default defineConfig({
  branch,
  // Get this from tina.io
  clientId: process.env.TINA_CLIENT_ID,
  // Get this from tina.io
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: 'admin/tina',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'cms-assets',
      publicFolder: 'public',
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      {
        name: 'pages',
        label: 'Pages',
        path: 'cms/pages',
        format: 'mdx',
        templates: [
          index,
          dips,
          past_events,
          road,
          faq,
          supporters,
          programming,
          tickets,
          about,
          speaker_applications,
          city_guide,
        ],
        ui: {
          router: ({ document }) => {
            const filenameToUrl = {
              index: '/',
              dips: '/dips',
              past_events: '/past-events',
              road_to_devcon: '/road-to-devcon',
              faq: '/',
              programming: '/programming',
              tickets: '/tickets',
              about: '/about',
              supporters: '/supporters',
              speaker_applications: '/speaker-applications',
              city_guide: '/city-guide',
            } as { [key: string]: string }

            return filenameToUrl[document._sys.filename] || document._sys.filename
          },
        },
      },
      // {
      //   name: 'page_cross_links',
      //   label: 'Page_cross_links',
      //   path: 'cms/page_cross_links',
      //   format: 'mdx',
      //   templates: [
      //     {
      //       name: 'entry',
      //       label: 'entry',
      //       fields: [createRichText('body')],
      //     },
      //   ],
      // },
    ],
  },
})
