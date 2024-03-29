import { defineConfig, Template, RichTextType } from 'tinacms'

// Field utilities
export const createRichText = (name: string, extra?: any): RichTextType => {
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
