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
    outputFolder: "admin",
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
            type: "string",
            name: "catchphrase",
            label: "Catchphrase",
          },
          {
            type: "rich-text",
            name: "subtext",
            label: "Subtext",
          },
          {
            type: "string",
            name: "button",
            label: "Button text",
          },
        ],
        ui: {
          router: ({ document }) => `/`,
        },
      },
    ],
  },
});
