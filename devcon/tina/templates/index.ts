import { Template } from 'tinacms'
import { button } from '../presets'

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
        button('button_info')
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
        button('button_info')
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
        button('button_info')
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
        button('button_info')
      ],
    },
    {
      label: 'Devcon Week',
      name: 'devcon_week',
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
        button('button_info')
      ],
    },
  ],
}

export default index
