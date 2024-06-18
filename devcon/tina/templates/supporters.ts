import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const supporters: Template = {
  name: 'supporters',
  label: 'supporters',
  fields: [
    createRichText('supporters'),
    {
      label: 'supporters_card',
      name: 'supporters_card',
      type: 'object',
      fields: [createRichText('card'), button('button')],
    },
    createRichText('impact_forum'),
    createRichText('programming_tickets'),
  ],
}

export default supporters
