import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const pastEditions: Template = {
  name: 'destino_devconnect',
  label: 'destino_devconnect',
  fields: [
    createRichText('intro'),
    createRichText('about_destino'),
    createRichText('who_can_apply'),
    {
      list: true,
      type: 'object',
      name: 'who_can_apply_list',
      label: 'Who can apply list',
      fields: [
        {
          name: 'title',
          type: 'string',
          label: 'Title',
        },
        {
          name: 'description',
          type: 'string',
          label: 'Description',
        },
      ],
    },
    {
      list: true,
      type: 'object',
      name: 'how_to_apply_list',
      label: 'How to apply list',
      fields: [
        {
          name: 'title',
          type: 'string',
          label: 'Title',
        },
        {
          name: 'description',
          type: 'string',
          label: 'Description',
        },
      ],
    },
    createRichText('events_list'),
  ],
}

export default pastEditions
