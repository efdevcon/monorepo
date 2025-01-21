import { defineConfig, Template, RichTextType } from 'tinacms'

const RichTextButtons = {
  name: 'Buttons',
  label: 'Buttons',
  fields: [
    {
      name: 'Button',
      label: 'Button',
      list: true,
      type: 'object',
      fields: [
        {
          name: 'text',
          label: 'text',
          type: 'string',
        },
        {
          name: 'url',
          label: 'url',
          type: 'string',
        },
        {
          component: 'select',
          options: [
            {
              label: 'purple',
              value: 'purple-1',
            },
            {
              label: 'blue',
              value: 'blue-1',
            },
            {
              label: 'teal',
              value: 'teal-1',
            },
            {
              label: 'green',
              value: 'green-1',
            },
            {
              label: 'orange',
              value: 'orange-1',
            },
          ],
          name: 'color',
          label: 'color',
          type: 'string',
        },
        {
          label: 'disabled',
          name: 'disabled',
          type: 'boolean',
        },
        {
          label: 'fill',
          name: 'fill',
          type: 'boolean',
        },
      ],
    },
  ],
}

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
            templates: [RichTextButtons],
          },
          {
            name: 'right',
            label: 'Right',
            type: 'rich-text',
            templates: [RichTextButtons],
          },
        ],
      },
      RichTextButtons,
    ],
  }
}

export const button = (name: string, extra?: any) => {
  return {
    label: name,
    name: name,
    type: 'object',
    ...extra,
    fields: [
      {
        label: 'link',
        name: 'link',
        type: 'string',
      },
      {
        label: 'text',
        name: 'text',
        type: 'string',
      },
      {
        label: 'color',
        name: 'color',
        type: 'string',
      },
      {
        label: 'disabled',
        name: 'disabled',
        type: 'boolean',
      },
    ],
  }
}
