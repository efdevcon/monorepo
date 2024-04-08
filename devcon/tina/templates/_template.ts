import { Template } from 'tinacms'
import { createRichText } from '../presets'

// Adjust this...
const faq: Template = {
  name: 'faq_general',
  label: 'faq_general',
  fields: [
    {
      label: 'questions',
      name: 'questions',
      list: true,
      type: 'object',
      fields: [createRichText('question')],
    },
  ],
}

export default faq
