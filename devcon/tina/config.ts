import { defineConfig, Template, RichTextType } from 'tinacms'
import faq from './templates/faq'
import road from './templates/road'
import past_events from './templates/past_events'
import dips from './templates/dips'
import index from './templates/index'

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
        templates: [index, dips, past_events, road, faq],
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

              default:
                return filename
            }
          },
        },
      },
    ],
  },
})
