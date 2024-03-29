import { Template } from 'tinacms'
import { createRichText } from '../presets'

// Adjust this...
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

export default past_events
