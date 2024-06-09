import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const tickets: Template = {
  name: 'tickets',
  label: 'Tickets',
  fields: [
    {
      label: 'placeholder_one',
      name: 'placeholder_one',
      type: 'object',
      fields: [createRichText('body')],
    },
  ],
}

export default tickets
