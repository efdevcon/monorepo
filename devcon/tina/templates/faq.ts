import { Template } from 'tinacms'
import { createRichText } from '../presets'

const faq: Template = {
  name: 'faq_general',
  label: 'faq_general',
  fields: [
    {
      label: 'questions',
      name: 'questions',
      list: true,
      type: 'object',
      fields: [{ label: 'question', name: 'question', type: 'string' }, createRichText('answer')],
    },
  ],
}

export default faq
