import { defineConfig, Template, RichTextType } from 'tinacms'

// Your hosting provider likely exposes this as an environment variable
const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main'

// Field utilities
const createRichText = (name: string): RichTextType => {
  return {
    label: name,
    name: name,
    type: 'rich-text',
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
      label: 'Section 1',
      name: 'section1',
      type: 'object',
      fields: [
        {
          label: 'Body',
          name: 'body',
          type: 'rich-text',
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
        },
      ],
    },
    {
      label: 'Section 2',
      name: 'section2',
      type: 'object',
      fields: [
        {
          label: 'Top',
          name: 'top',
          type: 'rich-text',
        },
        {
          label: 'Left',
          name: 'left',
          type: 'rich-text',
        },
        {
          label: 'Right',
          name: 'right',
          type: 'rich-text',
        },
        {
          label: 'Button',
          name: 'button',
          type: 'string',
        },
      ],
    },
    {
      label: 'Section 3',
      name: 'section3',
      type: 'object',
      fields: [
        {
          label: 'Body',
          name: 'body',
          type: 'rich-text',
        },
        {
          label: 'Button',
          name: 'button',
          type: 'string',
        },
      ],
    },
    {
      label: 'Section 4',
      name: 'section4',
      type: 'object',
      fields: [
        {
          label: 'Body',
          name: 'body',
          type: 'rich-text',
        },
        {
          label: 'Button',
          name: 'button',
          type: 'string',
        },
      ],
    },
    {
      label: 'Section 5',
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
      label: 'Section 1',
      name: 'section1',
      type: 'object',
      fields: [
        createRichText('body'),
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

const past_events: Template = {
  name: 'past_events',
  label: 'past_events',
  fields: [
    {
      label: 'Section 1',
      name: 'section1',
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
