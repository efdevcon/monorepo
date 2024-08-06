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
import sea_local from './templates/sea_local'
import { createRichText } from './presets'
import speaker_applications from './templates/speaker_applications'

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
          sea_local,
        ],
        ui: {
          router: ({ document }) => {
            const filename = document._sys.filename

            switch (filename) {
              case 'index':
                return '/'
              case 'dips':
                return '/dips'
              case 'past_events':
                return '/past-events'
              case 'road_to_devcon':
                return '/road-to-devcon'
              case 'faq':
                return '/'
              case 'programming':
                return '/programming'
              case 'tickets':
                return '/tickets'
              case 'about':
                return '/about'
              case 'supporters':
                return '/supporters'
              case 'speaker_applications':
                return '/speaker-applications'
              case 'city_guide':
                return '/city-guide'
              case 'sea_local':
                return '/sea-local'

              default:
                return filename
            }
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
