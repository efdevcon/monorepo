import { defineConfig, Template, RichTextType } from 'tinacms'

// Your hosting provider likely exposes this as an environment variable
const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main'

// Field utilities
const createRichText = (name: string, extra?: any): RichTextType => {
  return {
    label: name,
    name: name,
    type: 'rich-text',
    ...extra,
    templates: [
      {
        name: 'TwoColumns',
        label: 'TwoColumns',
        fields: [
          {
            name: 'left',
            label: 'Left',
            type: 'rich-text',
          },
          {
            name: 'right',
            label: 'Right',
            type: 'rich-text',
          },
        ],
      },
    ],
  }
}

// Pages:
const index: Template = {
  name: 'index',
  label: 'index',
  fields: [
    {
      label: 'section 1',
      name: 'section1',
      type: 'object',
      fields: [
        {
          label: 'body',
          name: 'body',
          type: 'rich-text',
          templates: [
            {
              name: 'TwoColumns',
              label: 'two columns',
              fields: [
                {
                  name: 'left',
                  label: 'left',
                  type: 'rich-text',
                },
                {
                  name: 'right',
                  label: 'right',
                  type: 'rich-text',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      label: 'section 2',
      name: 'section2',
      type: 'object',
      fields: [
        {
          label: 'top',
          name: 'top',
          type: 'rich-text',
        },
        {
          label: 'left',
          name: 'left',
          type: 'rich-text',
        },
        {
          label: 'right',
          name: 'right',
          type: 'rich-text',
        },
        {
          label: 'button',
          name: 'button',
          type: 'string',
        },
      ],
    },
    {
      label: 'section 3',
      name: 'section3',
      type: 'object',
      fields: [
        {
          label: 'body',
          name: 'body',
          type: 'rich-text',
        },
        {
          label: 'button',
          name: 'button',
          type: 'string',
        },
      ],
    },
    {
      label: 'section 4',
      name: 'section4',
      type: 'object',
      fields: [
        {
          label: 'body',
          name: 'body',
          type: 'rich-text',
        },
        {
          label: 'button',
          name: 'button',
          type: 'string',
        },
      ],
    },
    {
      label: 'section 5',
      name: 'section5',
      type: 'object',
      fields: [
        {
          label: 'Body',
          name: 'body',
          type: 'rich-text',
        },
        {
          label: 'Title',
          name: 'title',
          type: 'rich-text',
        },
        {
          label: 'Button',
          name: 'button',
          type: 'string',
        },
      ],
    },
  ],
}

const dips: Template = {
  name: 'dips',
  label: 'dips',
  fields: [
    {
      label: 'section 1',
      name: 'section1',
      type: 'object',
      fields: [createRichText('about', { required: true })],
    },
  ],
}

const past_events: Template = {
  name: 'past_events',
  label: 'past_events',
  fields: [
    {
      label: 'section 1',
      name: 'section1',
      type: 'object',
      fields: [createRichText('about', { required: true })],
    },
    {
      label: 'events',
      name: 'events',
      list: true,
      type: 'object',
      ui: {
        itemProps: item => {
          return { label: item?.title }
        },
      },
      fields: [
        {
          label: 'title',
          name: 'title',
          type: 'string',
          required: true,
        },
        createRichText('description'),
        {
          label: 'button',
          name: 'button',
          type: 'string',
        },
        {
          label: 'button link',
          name: 'button_link',
          type: 'string',
        },
        {
          label: 'image',
          name: 'image',
          type: 'image',
        },
      ],
    },
  ],
}

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
        templates: [index, dips, past_events],
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
              default:
                return filename
            }
          },
        },
      },
    ],
  },
})
