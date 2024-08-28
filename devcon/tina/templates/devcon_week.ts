import { Template } from 'tinacms'
import { createRichText } from '../presets'

const DevconWeek: Template = {
  name: 'devcon_week',
  label: 'devcon_week',
  fields: [
    createRichText('alert'),
    {
      label: 'devcon_week',
      name: 'devcon_week',
      type: 'object',
      fields: [createRichText('about', { required: true })],
    },
    {
      label: 'snapshot',
      name: 'snapshot',
      list: true,
      type: 'object',
      fields: [
        createRichText('left'),
        createRichText('right'),
        // { label: 'left', name: 'left', type: 'string' },
        // { label: 'right', name: 'right', type: 'string' },
      ],
    },
    {
      label: 'questions',
      name: 'questions',
      list: true,
      type: 'object',
      fields: [{ label: 'question', name: 'question', type: 'string' }, createRichText('answer')],
    },
  ],
}

export default DevconWeek
