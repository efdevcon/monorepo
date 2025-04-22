import { defineConfig } from 'tinacms'
import index from './templates/index'
import pastEditions from './templates/past-editions'
import destinoDevconnect from './templates/destino-devconnect'
// Your hosting provider likely exposes this as an environment variable
const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main'

console.log('TINA branch', branch)

const translationConfig = {
  name: 'global_translations',
  label: 'Global Translations',
  path: 'cms/global-translations',
  format: 'json',
  fields: [
    {
      type: 'string',
      name: 'global_translations',
      label: 'global_translations',
      ui: {
        description: 'You can use this editor to format your JSON: https://jsonformatter.org/json-editor',
        validate: (value: any) => {
          try {
            JSON.parse(value)
          } catch (e) {
            return 'Please enter valid JSON'
          }
        },
      },
    },
  ],
} as any

const pagesConfig = {
  name: 'pages',
  label: 'Pages',
  path: 'cms/pages',
  format: 'mdx',
  templates: [index, pastEditions, destinoDevconnect],
  ui: {
    router: ({ document }: { document: any }) => {
      const filename = document._sys.filename
      const filenameToUrl = {
        destino_devconnect: 'destino',
      } as any

      return filename ? filenameToUrl[filename] : '/'
    },
  },
} as any

export default defineConfig({
  branch,
  // Get this from tina.io
  clientId: process.env.TINA_CLIENT_ID,
  // Get this from tina.io
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'cms-media',
      publicFolder: 'public',
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      // {
      //   name: 'pages',
      //   label: 'Pages',
      //   path: 'cms/pages',
      //   format: 'mdx',
      //   templates: [
      //     index,
      //     pastEditions,
      //   ],
      //   ui: {
      //     router: ({ document }) => `/`,
      //   },
      // },
      pagesConfig,
      // {
      //   ...pagesConfig,
      //   path: 'cms/pages',
      //   name: 'es',
      //   label: 'Spanish',
      // },
      // {
      //   ...pagesConfig,
      //   path: 'cms/pages/pt',
      //   name: 'pt',
      //   label: 'Portuguese',
      // },
      translationConfig,
      // {
      //   ...translationConfig,
      //   path: 'cms/global-translations/es',
      //   name: 'global_translations',
      // },
      // {
      //   ...translationConfig,
      //   path: 'cms/global-translations/pt',
      //   name: 'global_translations',
      // }
      // {
      //   name: 'global_translations',
      //   label: 'Global Translations',
      //   path: 'cms/global-translations',
      //   format: 'json',
      //   fields: [
      //     {
      //       type: 'string',
      //       name: 'global_translations',
      //       label: 'global_translations',
      //       ui: {
      //         description: 'You can use this editor to format your JSON: https://jsonformatter.org/json-editor',
      //         validate: (value) => {
      //           try {
      //             JSON.parse(value);
      //           } catch (e) {
      //             return 'Please enter valid JSON';
      //           }
      //         },
      //       },
      //     }
      //   ],
      // },
    ],
  },
})
