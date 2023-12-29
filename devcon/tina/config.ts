import { defineConfig } from "tinacms";

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,
  // Get this from tina.io
  clientId: process.env.TINA_CLIENT_ID,
  // Get this from tina.io
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: "admin/tina",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "cms-media",
      publicFolder: "public",
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      {
        name: "pages",
        label: "Pages",
        path: "cms/pages",
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
              }
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
              }
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
              }
            ],
          },
          {
            label: 'Section 6',
            name: 'section6',
            type: 'object',
            fields: [
              {
                label: 'Button',
                name: 'button',
                type: 'string',
              }
            ],
          },
        ],
        ui: {
          router: ({ document }) => `/en`,
        },
      },
    ],
  },
});