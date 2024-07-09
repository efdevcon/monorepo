import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const index: Template = {
  name: 'index',
  label: 'index',
  fields: [
    {
      label: 'index_ctas',
      name: 'index_ctas',
      type: 'object',
      list: true,
      fields: [
        {
          label: 'title',
          name: 'title',
          type: 'string',
        },
        {
          label: 'text',
          name: 'text',
          type: 'string',
        },
        {
          label: 'url',
          name: 'url',
          type: 'string',
        },
      ],
    },
    {
      label: 'section 1',
      name: 'section1',
      type: 'object',
      fields: [createRichText('body')],
    },
    {
      label: 'section 2',
      name: 'section2',
      type: 'object',
      fields: [createRichText('top', { required: true })],
    },
    {
      label: 'section 3',
      name: 'section3',
      type: 'object',
      fields: [createRichText('body'), { type: 'string', label: 'graphic_url', name: 'graphic_url' }],
    },
    {
      label: 'section 4',
      name: 'section4',
      type: 'object',
      fields: [createRichText('body')],
    },
    {
      label: 'section 5',
      name: 'section5',
      type: 'object',
      fields: [createRichText('body'), createRichText('title'), button('button_info')],
    },
    {
      label: 'Devcon Week',
      name: 'devcon_week',
      type: 'object',
      fields: [createRichText('body'), createRichText('title'), button('button_info')],
    },
  ],
}

export default index
