import { Template } from 'tinacms'
import { createRichText } from '../presets'

// Adjust this...
const dips: Template = {
  name: 'dips',
  label: 'dips',
  fields: [
    {
      label: 'section 1',
      name: 'section1',
      type: 'object',
      fields: [createRichText('about', { required: true })],
    },
    createRichText('community_hubs'),
  ],
}

export default dips
