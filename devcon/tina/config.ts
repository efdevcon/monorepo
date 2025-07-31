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
import devcon_week from './templates/devcon_week'
import sea_local from './templates/sea_local'
import { createRichText } from './presets'
import speaker_applications from './templates/speaker_applications'
import { filenameToUrl } from '../../lib/cms/filenameToUrl'
import experiences from './templates/experiences'
// Your hosting provider likely exposes this as an environment variable
const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main'

console.log('TINA branch', branch)

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
          devcon_week,
          sea_local,
          experiences,
          {
            name: 'ai_context',
            label: 'ai_context',
            fields: [createRichText('ai_context')],
          },
        ],
        ui: {
          router: ({ document }) => {
            // If no explicit filenameToUrl mapping, replace underscores with dashes - won't catch everything, but probably good enough
            if (!filenameToUrl[document._sys.filename]) {
              return document._sys.filename.replace(/_/g, '-')
            }

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
